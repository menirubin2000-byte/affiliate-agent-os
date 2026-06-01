import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: products } = await supabase.from('products').select('id, name, slug, status, affiliate_url, category').not('slug', 'like', 'stage-%').not('slug', 'like', 'demo-%').order('name');
const { data: programs } = await supabase.from('affiliate_programs').select('id, product_id, program_name, status, affiliate_link, signup_url');
const { data: drafts } = await supabase.from('content_drafts').select('id, product_id, title, status, template_type');

let i = 1;
for (const p of products) {
  const prog = programs?.find(pr => pr.product_id === p.id);
  const pDrafts = drafts?.filter(d => d.product_id === p.id);
  const li = pDrafts?.find(d => d.title?.includes('[LinkedIn]'));
  const med = pDrafts?.find(d => d.title?.includes('[Medium]'));
  const sub = pDrafts?.find(d => d.title?.includes('[Substack]'));
  
  const linkStatus = prog?.affiliate_link ? 'REAL_LINK' : (prog?.status || 'no_program');
  const hasContent = [li ? 'LI' : '', med ? 'MD' : '', sub ? 'SS' : ''].filter(Boolean).join('+');
  
  console.log(`${i}. ${p.name} | ${p.category || '-'} | link=${linkStatus} | signup=${prog?.signup_url ? 'YES' : 'NO'} | content=${hasContent} | drafts_status=${li?.status || '-'}/${med?.status || '-'}/${sub?.status || '-'}`);
  i++;
}
console.log(`\nTotal: ${products.length} products`);
