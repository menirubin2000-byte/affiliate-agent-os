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

const LONG_FORM = new Set(['medium', 'substack', 'linkedin'])
const INCOME = [
  /\bguaranteed income\b/i, /\bguaranteed results\b/i, /\bguarantee[sd]?\b/i,
  /\bearn\s+\$?\d+/i, /\bmake\s+\$?\d+/i,
]
const INTERNAL = [
  /no fake personal experience[^\n]*/i, /no fake rating[^\n]*/i,
  /no fake earnings[^\n]*/i, /no fake .*claim[^\n]*/i,
  /this draft does not claim[^\n]*/i,
]

function countOcc(v, n) { return n ? v.split(n).length - 1 : 0 }

function validateLong(body, link) {
  const sig = link?.includes('https://systeme.io/?sa=') ? 'https://systeme.io/?sa=' : link
  const firstIdx = sig ? body.indexOf(sig) : -1
  const discIdx = body.toLowerCase().indexOf('affiliate disclosure:')
  const linkCount = link ? countOcc(body, link) : 0
  const urlCount = sig ? countOcc(body, sig) : 0
  const ctaCount = countOcc(body.toLowerCase(), '## call to action')
  const notes = INTERNAL.some(p => p.test(body))
  const income = INCOME.some(p => p.test(body))
  const fails = []
  if (!(discIdx === 0 && (firstIdx === -1 || discIdx < firstIdx))) fails.push('disclosureAtTop')
  if (!(ctaCount === 1 && linkCount === 1)) fails.push('oneCtaOnly')
  if (linkCount !== 1) fails.push('affiliateLinkExists')
  if (urlCount !== 1) fails.push('noDuplicateUrl')
  if (notes) fails.push('internalNotes')
  if (income) fails.push('incomeOrGuaranteeClaim')
  return { status: fails.length ? 'blocked' : 'valid', fails }
}

function validateShort(body, link) {
  const discIdx = body.toLowerCase().indexOf('affiliate disclosure')
  const notes = INTERNAL.some(p => p.test(body))
  const income = INCOME.some(p => p.test(body))
  const hasLink = link ? body.includes(link) : true
  const fails = []
  if (discIdx < 0) fails.push('missingDisclosure')
  if (!hasLink) fails.push('missingAffiliateLink')
  if (notes) fails.push('internalNotes')
  if (income) fails.push('incomeOrGuaranteeClaim')
  if (body.length < 10) fails.push('bodyTooShort')
  return { status: fails.length ? 'blocked' : 'valid', fails }
}

const { data } = await sb.from('final_copies')
  .select('id, platform, language, body, affiliate_link, products(name)')
  .in('status', ['ready_for_operator_approval', 'operator_approved'])

let pass = 0, fail = 0
const failures = []
for (const p of data) {
  const body = (p.body || '').trim()
  const result = LONG_FORM.has(p.platform)
    ? validateLong(body, p.affiliate_link ?? undefined)
    : validateShort(body, p.affiliate_link ?? undefined)
  if (result.status === 'valid') pass++
  else {
    fail++
    failures.push({ name: p.products?.name, plat: p.platform, lang: p.language, fails: result.fails })
  }
}

console.log(`PASS: ${pass} | FAIL: ${fail} | Total: ${pass + fail}`)
if (failures.length) {
  console.log('\n=== FAILURES ===')
  for (const f of failures) {
    console.log(`${f.name} / ${f.plat} / ${f.lang}: ${f.fails.join(', ')}`)
  }
}
