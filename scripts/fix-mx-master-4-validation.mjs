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

const PRODUCT_ID = '856173da-5e3c-47a3-8bd7-807a6d59e167'
const LINK = 'https://amzn.to/3Qm6GLY'

const { data: posts } = await sb.from('final_copies')
  .select('id, platform, language, body')
  .eq('product_id', PRODUCT_ID)

let fixed = 0
for (const p of posts) {
  let body = p.body
  let changed = false

  // 1. Instagram/TikTok — add link if missing
  if (['instagram_professional', 'tiktok'].includes(p.platform) && !body.includes(LINK)) {
    body = body.replace(/link in bio[.]?/i, LINK)
    if (!body.includes(LINK)) body += `\n\n${LINK}`
    changed = true
  }

  // 2. Long-form (linkedin, medium, substack) — need exactly 1 "## Call to Action" + link once
  if (['linkedin', 'medium', 'substack'].includes(p.platform)) {
    const ctaCount = (body.toLowerCase().match(/## call to action/g) || []).length
    const linkCount = (body.split(LINK).length - 1)

    if (ctaCount === 0) {
      // Add CTA section at end with link exactly once
      // First remove any existing bare links
      body = body.split('\n').filter(l => l.trim() !== LINK).join('\n')
      body = body.trimEnd() + `\n\n## Call to Action\n\n${LINK}`
      changed = true
    }
    if (ctaCount > 1) {
      // Remove duplicate CTA sections
      const lines = body.split('\n')
      let ctaSeen = false
      const filtered = []
      for (const line of lines) {
        if (line.toLowerCase().trim() === '## call to action') {
          if (ctaSeen) continue
          ctaSeen = true
        }
        filtered.push(line)
      }
      body = filtered.join('\n')
      changed = true
    }
    // Ensure link appears exactly once
    const finalLinkCount = (body.split(LINK).length - 1)
    if (finalLinkCount > 1) {
      // Keep only the last occurrence (in CTA)
      const parts = body.split(LINK)
      body = parts.slice(0, -1).join('') + LINK + (parts[parts.length - 1] || '')
      changed = true
    }
    if (finalLinkCount === 0) {
      body += `\n\n${LINK}`
      changed = true
    }
  }

  // 3. Quora — needs disclosure, no direct link (per policy)
  if (p.platform === 'quora') {
    if (!body.toLowerCase().includes('affiliate disclosure')) {
      body = `Affiliate disclosure: this answer mentions a product I may earn a commission from.\n\n${body}`
      changed = true
    }
    // Remove direct link if present (Quora policy: no affiliate links)
    // But validation requires it... check what existing quora posts do
  }

  // 4. Reddit — needs disclosure, no direct link (per policy)
  if (p.platform === 'reddit') {
    if (!body.toLowerCase().includes('affiliate disclosure')) {
      body = `Affiliate disclosure: this post mentions a product I may earn a commission from.\n\n${body}`
      changed = true
    }
  }

  if (changed) {
    const { error } = await sb.from('final_copies').update({ body }).eq('id', p.id)
    if (error) console.error(`FAIL ${p.platform} (${p.language}):`, error.message)
    else { console.log(`FIXED ${p.platform} (${p.language})`); fixed++ }
  }
}

console.log(`\nFixed ${fixed} posts. Re-run test-validation.mjs to verify.`)
