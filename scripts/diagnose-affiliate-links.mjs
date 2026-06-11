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

const { data: posts } = await sb.from('final_copies')
  .select('id, platform, language, body, affiliate_link, products(name)')
  .in('status', ['ready_for_operator_approval', 'operator_approved'])

const NO_DIRECT_LINK = new Set(['reddit', 'quora'])

const categories = {
  redditQuora: [],
  linkInBody: [],
  linkMissing: [],
  noLink: [],
}

for (const p of posts) {
  const body = (p.body || '').trim()
  const name = p.products?.name ?? '?'
  const link = p.affiliate_link

  if (!link) {
    categories.noLink.push({ name, platform: p.platform, lang: p.language })
    continue
  }

  if (NO_DIRECT_LINK.has(p.platform)) {
    categories.redditQuora.push({ name, platform: p.platform, lang: p.language, link })
    continue
  }

  if (body.includes(link)) {
    categories.linkInBody.push({ name, platform: p.platform, lang: p.language })
  } else {
    const urls = body.match(/https?:\/\/[^\s)]+/g) || []
    categories.linkMissing.push({ name, platform: p.platform, lang: p.language, dbLink: link, bodyUrls: urls })
  }
}

console.log(`=== SUMMARY ===`)
console.log(`Total posts: ${posts.length}`)
console.log(`affiliate_link is NULL (OK): ${categories.noLink.length}`)
console.log(`Link found in body (OK): ${categories.linkInBody.length}`)
console.log(`Reddit/Quora with non-null link (need NULL): ${categories.redditQuora.length}`)
console.log(`Link NOT in body (need fix): ${categories.linkMissing.length}`)

console.log(`\n=== REDDIT/QUORA (need affiliate_link=NULL) ===`)
for (const r of categories.redditQuora) {
  console.log(`  ${r.name} / ${r.platform} / ${r.lang}`)
}

console.log(`\n=== LINK MISSING FROM BODY ===`)
for (const m of categories.linkMissing) {
  console.log(`  ${m.name} / ${m.platform} / ${m.lang}`)
  console.log(`    DB link: ${m.dbLink}`)
  if (m.bodyUrls.length) {
    console.log(`    Body URLs: ${m.bodyUrls.join(', ')}`)
  } else {
    console.log(`    Body URLs: (none)`)
  }
}
