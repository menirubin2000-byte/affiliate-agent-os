import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data } = await supabase.from('affiliate_programs')
  .select('program_name, status, signup_url, network')
  .in('program_name', [
    'Jasper AI Affiliate Program',
    'Semrush Affiliate Program',
    'Surfer SEO Affiliate Program'
  ]);

for (const p of data) {
  console.log(`${p.program_name}`);
  console.log(`  status: ${p.status}`);
  console.log(`  network: ${p.network}`);
  console.log(`  signup: ${p.signup_url}`);
  console.log('');
}
