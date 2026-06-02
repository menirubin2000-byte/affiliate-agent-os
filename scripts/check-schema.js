const { Client } = require('pg');
const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: '5552223332RRuu', ssl: { rejectUnauthorized: false }
});
async function main() {
  await c.connect();
  const tables = ['source_contents', 'platform_adaptations', 'published_records', 'final_copies'];
  for (const t of tables) {
    const r = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [t]);
    console.log('\n=== ' + t + ' ===');
    r.rows.forEach(x => console.log('  ' + x.column_name + ': ' + x.data_type));
  }
  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
