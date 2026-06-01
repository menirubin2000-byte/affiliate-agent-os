import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data } = await supabase.from('affiliate_programs')
  .select('program_name, status, signup_url, network')
  .or('program_name.ilike.%jasper%,program_name.ilike.%semrush%,program_name.ilike.%surfer%');

for (const p of data) {
  console.log(`${p.program_name} | ${p.status} | ${p.network} | ${p.signup_url}`);
}

if (data.length < 3) {
  console.log('\n--- Missing programs, checking products ---');
  const { data: products } = await supabase.from('products')
    .select('id, name')
    .or('name.ilike.%jasper%,name.ilike.%semrush%,name.ilike.%surfer%');
  for (const p of products) console.log(`Product: ${p.name} (${p.id})`);
}
