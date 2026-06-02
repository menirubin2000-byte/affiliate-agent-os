const { Client } = require('pg');
const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: '5552223332RRuu', ssl: { rejectUnauthorized: false }
});

// These posts are ALREADY published with real URLs
const PUBLISHED = [
  { product: 'Systeme.io', platform: 'linkedin', url: 'https://www.linkedin.com/feed/update/urn:li:activity:7466268842743422976/' },
  { product: 'Systeme.io', platform: 'medium', url: 'https://medium.com/@Rubin-Q.S/systeme-io-review-free-funnel-and-email-marketing-platform-for-online-businesses-8c4f042ceaa9' },
  { product: 'Systeme.io', platform: 'substack', url: 'https://menirubin.substack.com/p/systemeio-review' },
  { product: 'ElevenLabs', platform: 'linkedin', url: 'https://www.linkedin.com/feed/update/urn:li:activity:7466494313263284224/' },
  { product: 'ElevenLabs', platform: 'medium', url: 'https://medium.com/@Rubin-Q.S/elevenlabs-review-is-it-worth-it-in-2026-e9f198c5c04f' },
  { product: 'ElevenLabs', platform: 'substack', url: 'https://menirubin.substack.com/p/elevenlabs-quick-review' },
];

async function main() {
  await c.connect();

  for (const pub of PUBLISHED) {
    // Find final copy
    const fc = await c.query(`
      SELECT fc.id FROM final_copies fc
      JOIN products p ON fc.product_id = p.id
      WHERE p.name = $1 AND fc.platform = $2
      LIMIT 1
    `, [pub.product, pub.platform]);

    if (!fc.rows.length) {
      console.log('No final copy for:', pub.product, pub.platform);
      continue;
    }

    // Check if already recorded
    const existing = await c.query(
      'SELECT id FROM published_records WHERE final_copy_id = $1', [fc.rows[0].id]
    );

    if (existing.rows.length) {
      console.log('ALREADY RECORDED:', pub.product, pub.platform);
      continue;
    }

    // Record as published
    await c.query(`
      INSERT INTO published_records (final_copy_id, platform, published_url, published_at)
      VALUES ($1, $2, $3, now())
    `, [fc.rows[0].id, pub.platform, pub.url]);

    // Update final copy status
    await c.query(`
      UPDATE final_copies SET status = 'published_verified', updated_at = now()
      WHERE id = $1
    `, [fc.rows[0].id]);

    console.log('RECORDED:', pub.product, pub.platform, '→', pub.url);
  }

  // Summary
  const summary = await c.query('SELECT status, count(*) as cnt FROM final_copies GROUP BY status');
  console.log('\nStatus summary:');
  summary.rows.forEach(r => console.log(' ', r.status, ':', r.cnt));

  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
