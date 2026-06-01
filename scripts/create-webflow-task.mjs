import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: webflowProg } = await supabase.from('affiliate_programs')
  .select('product_id')
  .eq('program_name', 'Webflow Affiliate Program')
  .single();

const { data, error } = await supabase.from('improvement_tasks').insert({
  product_id: webflowProg?.product_id || null,
  source_type: 'manual',
  priority: 'medium',
  status: 'open',
  title: 'Improve Webflow affiliate application profile before resubmission',
  description: 'Webflow rejected the affiliate application on 2026-05-30. Before resubmitting: 1) Build more content on Substack/Medium/LinkedIn 2) Get more followers/subscribers 3) Create Webflow-specific review content 4) Consider creating a dedicated website.',
  suggested_action: 'Build audience and content portfolio, then reapply to Webflow affiliate program via PartnerStack.'
}).select('id');

if (error) console.log('ERROR:', error.message);
else console.log('Improvement task created:', data[0].id);
