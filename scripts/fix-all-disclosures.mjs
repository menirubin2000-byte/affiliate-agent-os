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

const SHORT = 'Affiliate disclosure: this post includes an affiliate link.'

const { data: posts } = await sb.from('final_copies')
  .select('id, body, platform, language')
  .in('status', ['ready_for_operator_approval', 'operator_approved'])
  .ilike('body', 'Affiliate disclosure%')

let fixed = 0
let skipped = 0
for (const p of posts) {
  const lines = p.body.split('\n')
  const firstLine = lines[0].trim()

  if (firstLine === SHORT) { skipped++; continue }

  // Find where the disclosure ends (first empty line or line not starting with disclosure text)
  let disclosureEnd = 0
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim().toLowerCase()
    if (l.startsWith('affiliate disclosure') || l === '') {
      disclosureEnd = i
    } else {
      break
    }
  }

  // Replace everything up to disclosureEnd with the short version
  const rest = lines.slice(disclosureEnd + 1).join('\n').trim()
  const newBody = `${SHORT}\n\n${rest}`

  const { error } = await sb.from('final_copies').update({ body: newBody }).eq('id', p.id)
  if (error) {
    console.error(`FAIL ${p.id} (${p.platform}/${p.language}):`, error.message)
  } else {
    fixed++
  }
}

console.log(`Fixed: ${fixed}, Already OK: ${skipped}, Total: ${posts.length}`)
