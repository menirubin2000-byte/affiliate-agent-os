#!/usr/bin/env node
// Quick DB query tool — pass SQL as argument
// Usage: node scripts/ops/db-query.mjs "SELECT count(*) FROM products"
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(import.meta.dirname, '../..')
const envRaw = readFileSync(resolve(root, '.env.local'), 'utf8')
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const query = process.argv[2]
if (!query) { console.error('Usage: node db-query.mjs "SELECT ..."'); process.exit(1) }

// For SELECT queries, parse table name and use Supabase
// For complex queries, use pg directly
import pg from 'pg'
const client = new pg.Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
})

await client.connect()
try {
  const result = await client.query(query)
  if (result.rows?.length) {
    console.table(result.rows)
  } else {
    console.log(`Done. Rows affected: ${result.rowCount}`)
  }
} catch (e) {
  console.error('Query error:', e.message)
} finally {
  await client.end()
}
