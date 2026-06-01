import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const { data: products } = await supabase.from('products').select('id, name, slug, status, affiliate_url').order('name');
console.log('PRODUCTS:', products?.length);
for (const p of (products || [])) {
  console.log(`- ${p.name} | status=${p.status} | link=${p.affiliate_url ? 'YES' : 'NO'}`);
}
const { data: programs } = await supabase.from('affiliate_programs').select('id, product_id, program_name, status, affiliate_link, signup_url').order('program_name');
console.log('\nPROGRAMS:', programs?.length);
for (const p of (programs || [])) {
  console.log(`- ${p.program_name} | status=${p.status} | link=${p.affiliate_link ? 'YES' : 'NO'} | signup=${p.signup_url ? 'YES' : 'NO'}`);
}
