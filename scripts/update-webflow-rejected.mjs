import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 1. Update Webflow status to rejected
const { error: e1 } = await supabase.from('affiliate_programs').update({ 
  status: 'rejected',
  affiliate_link: null,
  notes: 'Webflow rejected the affiliate application. Reason: profile/site/audience/promotion plan not verified or not a fit at this time. Can resubmit later with stronger verified platform details.'
}).eq('program_name', 'Webflow Affiliate Program');

if (e1) console.log('ERROR updating Webflow:', e1.message);
else console.log('Webflow updated to rejected');

// 2. Create improvement task
const { data: webflowProg } = await supabase.from('affiliate_programs')
  .select('product_id')
  .eq('program_name', 'Webflow Affiliate Program')
  .single();

const { error: e2 } = await supabase.from('improvement_tasks').insert({
  product_id: webflowProg?.product_id || null,
  task_type: 'affiliate_reapply',
  title: 'Improve Webflow affiliate application profile before resubmission',
  description: 'Webflow rejected the affiliate application on 2026-05-30. Before resubmitting: 1) Build more content on Substack/Medium/LinkedIn 2) Get more followers/subscribers 3) Create Webflow-specific review content 4) Consider creating a dedicated website with portfolio.',
  priority: 'medium',
  status: 'open'
}).select('id');

if (e2) console.log('ERROR creating task:', e2.message);
else console.log('Improvement task created');

// 3. Report all 5 statuses
const { data } = await supabase.from('affiliate_programs')
  .select('program_name, status')
  .in('program_name', [
    'Writesonic Affiliate Program',
    'ElevenLabs Affiliate Program', 
    'ClickUp Affiliate Program',
    'Webflow Affiliate Program',
    'Monday.com Affiliate Program'
  ]);

console.log('\n=== STATUS ===');
for (const p of data) console.log(`${p.program_name}: ${p.status}`);
