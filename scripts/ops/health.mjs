#!/usr/bin/env node
// Quick health check — Docker + Supabase + Vercel
const checks = []

async function check(name, fn) {
  try {
    const result = await fn()
    checks.push({ name, ok: true, detail: result })
  } catch (e) {
    checks.push({ name, ok: false, detail: e.message })
  }
}

await check('Docker (localhost:3000)', async () => {
  const r = await fetch('http://localhost:3000', { signal: AbortSignal.timeout(3000) })
  return `HTTP ${r.status}`
})

await check('Vercel (production)', async () => {
  const r = await fetch('https://affiliate-agent-os.vercel.app/api/ai/generate', {
    method: 'HEAD', signal: AbortSignal.timeout(5000)
  })
  return `HTTP ${r.status}`
})

await check('Supabase REST', async () => {
  const r = await fetch('https://gbkwydsodondarccqyet.supabase.co/rest/v1/', {
    signal: AbortSignal.timeout(3000)
  })
  return `HTTP ${r.status}`
})

console.log('\n=== Health Check ===')
let allOk = true
for (const c of checks) {
  const icon = c.ok ? 'OK' : 'FAIL'
  console.log(`[${icon}] ${c.name} — ${c.detail}`)
  if (!c.ok) allOk = false
}
console.log(allOk ? '\nAll systems operational.' : '\nIssues detected!')
process.exit(allOk ? 0 : 1)
