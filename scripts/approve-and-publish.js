const { Client } = require('pg');
const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: '5552223332RRuu', ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();

  // Mark as approved
  await c.query(`
    UPDATE final_copies
    SET status = 'operator_approved', approved_by = 'MENI', approved_at = now(), updated_at = now()
    WHERE id = '13fba284-6ce1-4ff7-a967-fc9e0e62ebdd'
  `);
  console.log('Status: operator_approved');

  // Verify
  const r = await c.query('SELECT status, approved_by, approved_at FROM final_copies WHERE id = $1', ['13fba284-6ce1-4ff7-a967-fc9e0e62ebdd']);
  console.log('Verified:', r.rows[0]);

  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
