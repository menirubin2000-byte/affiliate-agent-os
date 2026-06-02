const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    host: 'db.gbkwydsodondarccqyet.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_SERVICE_ROLE_KEY,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if final_copies table already exists
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'final_copies'
      );
    `);

    if (checkResult.rows[0].exists) {
      console.log('Table final_copies already exists - skipping creation');
    } else {
      const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '018_final_copies.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await client.query(sql);
      console.log('Migration 018 executed successfully');
    }

    // Verify table exists
    const verifyResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'final_copies'
      ORDER BY ordinal_position;
    `);

    console.log('final_copies columns:', verifyResult.rows.length);
    verifyResult.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
