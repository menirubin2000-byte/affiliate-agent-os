require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg');
const { requireApprovalOverride } = require('./safety-guard');
const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false }
});

async function main() {
  requireApprovalOverride('scripts/approve-all.js');

  await c.connect();

  const result = await c.query(`
    UPDATE final_copies
    SET status = 'operator_approved', approved_by = 'MENI', approved_at = now(), updated_at = now()
    WHERE status = 'ready_for_operator_approval'
    RETURNING id, platform, (SELECT name FROM products WHERE id = final_copies.product_id) as product
  `);

  result.rows.forEach(r => console.log('APPROVED:', r.product, r.platform));
  console.log('\nTotal approved:', result.rows.length);

  // Summary
  const summary = await c.query('SELECT status, count(*) as cnt FROM final_copies GROUP BY status');
  console.log('\nAll final copies:');
  summary.rows.forEach(r => console.log(' ', r.status, ':', r.cnt));

  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
