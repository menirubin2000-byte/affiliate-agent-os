#!/usr/bin/env node
// Full system status — Docker + App + DB + Platforms
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(import.meta.dirname, '../..')
const envRaw = readFileSync(resolve(root, '.env.local'), 'utf8')
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  const now = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })
  console.log(`\n========== סטטוס מערכת — ${now} ==========\n`)

  // 1. Docker
  console.log('--- Docker ---')
  try {
    const res = await fetch('http://localhost:3000', { signal: AbortSignal.timeout(3000) })
    console.log(`App HTTP: ${res.status} ${res.statusText}`)
  } catch (e) {
    console.log(`App HTTP: DOWN (${e.message})`)
  }

  // 2. Supabase connection
  console.log('\n--- Supabase ---')
  const { count: prodCount } = await sb.from('products').select('*', { count: 'exact', head: true })
  const { count: fcCount } = await sb.from('final_copies').select('*', { count: 'exact', head: true })
  const { count: pubCount } = await sb.from('published_records').select('*', { count: 'exact', head: true })
  const { count: jobCount } = await sb.from('publishing_jobs').select('*', { count: 'exact', head: true })
  const { count: apCount } = await sb.from('affiliate_programs').select('*', { count: 'exact', head: true })
  console.log(`Products: ${prodCount}`)
  console.log(`Final Copies: ${fcCount}`)
  console.log(`Published Records: ${pubCount}`)
  console.log(`Publishing Jobs: ${jobCount}`)
  console.log(`Affiliate Programs: ${apCount}`)

  // 3. Active affiliate links
  console.log('\n--- לינקים פעילים ---')
  const { data: activeLinks } = await sb.from('affiliate_programs')
    .select('product_id, network, status, affiliate_link, products(name)')
    .not('affiliate_link', 'is', null)
    .order('status')
  for (const a of activeLinks || []) {
    console.log(`  ${a.products?.name} | ${a.network} | ${a.status}`)
  }

  // 4. Final copies by status
  console.log('\n--- Final Copies לפי סטטוס ---')
  const { data: allFc } = await sb.from('final_copies').select('status')
  if (allFc) {
    const groups = {}
    for (const fc of allFc) { groups[fc.status] = (groups[fc.status] || 0) + 1 }
    for (const [s, c] of Object.entries(groups).sort()) console.log(`  ${s}: ${c}`)
  }

  // 5. Published records by platform
  console.log('\n--- פרסומים לפי פלטפורמה ---')
  const { data: pubs } = await sb.from('published_records').select('platform, live_url')
  if (pubs) {
    const byPlat = {}
    for (const p of pubs) { byPlat[p.platform] = (byPlat[p.platform] || 0) + 1 }
    for (const [p, c] of Object.entries(byPlat).sort()) console.log(`  ${p}: ${c}`)
  }

  // 6. Pending approvals
  console.log('\n--- ממתינים לאישור ---')
  const { data: pending } = await sb.from('final_copies')
    .select('product_id, platform, language, products(name)')
    .eq('status', 'ready_for_operator_approval')
    .limit(20)
  if (pending?.length) {
    for (const p of pending) console.log(`  ${p.products?.name} | ${p.platform} | ${p.language}`)
  } else {
    console.log('  אין פוסטים ממתינים')
  }

  console.log('\n==========================================\n')
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
