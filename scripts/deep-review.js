const { Client } = require('pg');
const c = new Client({
  host: 'db.gbkwydsodondarccqyet.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: '5552223332RRuu', ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();

  const copies = await c.query(`
    SELECT fc.id, fc.title, fc.body, fc.affiliate_link, fc.platform, fc.status, p.name as product
    FROM final_copies fc
    JOIN products p ON fc.product_id = p.id
    ORDER BY p.name, fc.platform
  `);

  console.log('=== Deep Review: ' + copies.rows.length + ' posts ===\n');

  const issues = [];

  for (const copy of copies.rows) {
    const problems = [];
    const body = copy.body;

    // 1. Platform-specific length
    if (copy.platform === 'tiktok' && body.length > 500) {
      problems.push('TikTok script too long (' + body.length + ' chars, max ~500)');
    }
    if (copy.platform === 'linkedin' && body.length > 3000) {
      problems.push('LinkedIn post too long (' + body.length + ' chars, max ~3000)');
    }
    if (copy.platform === 'quora' && !body.toLowerCase().includes('?')) {
      // Quora answers should reference a question
    }

    // 2. Wrong content for platform
    if (copy.platform === 'tiktok' && body.includes('## ')) {
      problems.push('TikTok should not have markdown headers');
    }
    if (copy.platform === 'reddit' && body.includes('## ')) {
      // Reddit supports markdown, OK
    }

    // 3. Duplicate content across platforms
    // Check if the same body is used for different platforms
    const dupes = copies.rows.filter(c2 =>
      c2.product === copy.product && c2.id !== copy.id && c2.body === copy.body
    );
    if (dupes.length > 0) {
      problems.push('DUPLICATE: same body as ' + dupes.map(d => d.platform).join(', '));
    }

    // 4. Affiliate link present
    if (!copy.affiliate_link) {
      problems.push('No affiliate link');
    } else if (!body.includes(copy.affiliate_link.split('?')[0]) && !body.includes('ref=')) {
      problems.push('Affiliate link domain not in body');
    }

    // 5. Income claims
    const banned = ['guaranteed', 'guarantee', 'make money', 'get rich', 'passive income', 'earn $', 'income guarantee'];
    for (const b of banned) {
      if (body.toLowerCase().includes(b)) {
        problems.push('Banned phrase: "' + b + '"');
      }
    }

    // 6. Disclosure
    if (!body.toLowerCase().includes('disclosure') && !body.toLowerCase().includes('affiliate')) {
      problems.push('Missing disclosure');
    }

    // 7. Internal notes
    if (body.includes('No fake') || body.includes('INTERNAL') || body.includes('TODO') || body.includes('This draft')) {
      problems.push('Contains internal notes');
    }

    // 8. Product name matches
    if (!body.toLowerCase().includes(copy.product.toLowerCase().split('.')[0].split(' ')[0])) {
      problems.push('Product name not mentioned in body');
    }

    if (problems.length > 0) {
      console.log('❌ ' + copy.product + ' | ' + copy.platform);
      problems.forEach(p => console.log('   ' + p));
      issues.push({ ...copy, problems });
    } else {
      console.log('✅ ' + copy.product + ' | ' + copy.platform);
    }
  }

  console.log('\n=== Summary ===');
  console.log('Total:', copies.rows.length);
  console.log('Clean:', copies.rows.length - issues.length);
  console.log('Issues:', issues.length);

  if (issues.length > 0) {
    console.log('\n=== Posts needing fix ===');
    issues.forEach(i => console.log(i.product, i.platform, ':', i.problems.join('; ')));
  }

  await c.end();
}
main().catch(e => { console.error(e.message); c.end(); });
