import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(import.meta.dirname, '..')
const envRaw = readFileSync(resolve(root, '.env.local'), 'utf8')
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const INTERNAL_PATTERNS = [
  /reditus partner,?\s*commission\s*\d+%/i,
  /affiliate program open via partnerstack[^.]*\./i,
  /affiliate program open to everyone[^.]*\./i,
  /\d+%\s*(lifetime\s*)?recurring\s*\d+\s*months?/i,
  /\d+-day cookie/i,
  /normal product url[^.]*\./i,
  /needs affiliate signup[^.]*$/i,
  /commission\s*\d+%/i,
  /no approval needed\.\s*/i,
]

const { data: posts } = await sb.from('final_copies')
  .select('id, body, platform, language')
  .in('status', ['ready_for_operator_approval', 'operator_approved'])

let fixed = 0
for (const p of posts) {
  let body = p.body
  let changed = false

  for (const pat of INTERNAL_PATTERNS) {
    if (pat.test(body)) {
      // Remove lines containing the pattern
      const lines = body.split('\n')
      const cleaned = lines.filter(line => !pat.test(line))
      body = cleaned.join('\n')
      changed = true
    }
  }

  // Also remove "Hook: Reditus..." or "Hook: Affiliate program..." lines
  if (/Hook:\s*(Reditus|Affiliate program)/i.test(body)) {
    body = body.split('\n').filter(l => !/Hook:\s*(Reditus|Affiliate program)/i.test(l)).join('\n')
    changed = true
  }

  // Clean up multiple blank lines
  if (changed) {
    body = body.replace(/\n{3,}/g, '\n\n').trim()
    const { error } = await sb.from('final_copies').update({ body }).eq('id', p.id)
    if (error) console.error(`FAIL ${p.platform}/${p.language}:`, error.message)
    else { fixed++; console.log(`FIXED ${p.platform}/${p.language} (${p.id.slice(0,8)})`) }
  }
}

console.log(`\nFixed: ${fixed}`)
