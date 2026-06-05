require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg');
const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();

  // All products with affiliate links
  const links = await c.query(
    "SELECT p.name, ap.network, ap.status, ap.affiliate_link FROM affiliate_programs ap JOIN products p ON ap.product_id = p.id WHERE ap.affiliate_link IS NOT NULL ORDER BY ap.status, p.name"
  );
  console.log('=== Products with affiliate links ===');
  links.rows.forEach(x => console.log(x.name, '|', x.status, '|', x.affiliate_link));

  // All products with link_ready status
  const ready = await c.query(
    "SELECT p.name, ap.status FROM affiliate_programs ap JOIN products p ON ap.product_id = p.id WHERE ap.status = 'link_ready' ORDER BY p.name"
  );
  console.log('\n=== link_ready ===');
  ready.rows.forEach(x => console.log(x.name));

  // Products with submitted status
  const submitted = await c.query(
    "SELECT p.name, ap.status FROM affiliate_programs ap JOIN products p ON ap.product_id = p.id WHERE ap.status = 'submitted' ORDER BY p.name"
  );
  console.log('\n=== submitted ===');
  submitted.rows.forEach(x => console.log(x.name));

  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
