const { Client } = require('pg');
const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: '5552223332RRuu', ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();

  // All 51 products
  const products = await c.query('SELECT id, name FROM products ORDER BY name');
  console.log('=== כל המוצרים (' + products.rows.length + ') ===');
  products.rows.forEach((p, i) => console.log((i+1) + '. ' + p.name));

  // Products with affiliate links
  const withLinks = await c.query(`
    SELECT p.name, ap.status, ap.affiliate_link, ap.network
    FROM affiliate_programs ap
    JOIN products p ON ap.product_id = p.id
    WHERE ap.affiliate_link IS NOT NULL
    ORDER BY p.name
  `);
  console.log('\n=== לינק אפיליאט פעיל (' + withLinks.rows.length + ') ===');
  withLinks.rows.forEach(r => console.log(r.name, '|', r.status, '|', r.affiliate_link));

  // Final copies status
  const finals = await c.query(`
    SELECT p.name, fc.platform, fc.status
    FROM final_copies fc
    JOIN products p ON fc.product_id = p.id
    ORDER BY p.name, fc.platform
  `);
  console.log('\n=== Final Copies (' + finals.rows.length + ') ===');
  finals.rows.forEach(r => console.log(r.name, '|', r.platform, '|', r.status));

  // All tables
  const tables = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log('\n=== טבלאות ===');
  tables.rows.forEach(r => console.log(r.table_name));

  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
