const { Client } = require('pg');
const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: '5552223332RRuu', ssl: { rejectUnauthorized: false }
});
async function main() {
  await c.connect();
  const r = await c.query("SELECT p.id, p.name, ap.status, ap.affiliate_link, ap.network FROM products p LEFT JOIN affiliate_programs ap ON ap.product_id = p.id WHERE p.name LIKE '%Willo%' OR p.name LIKE '%willo%'");
  console.log('Willo:', JSON.stringify(r.rows, null, 2));
  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
