import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { error } = await supabase.from('affiliate_programs').update({ 
  status: 'submitted',
  notes: 'Applied via PartnerStack (mondaycom.partnerstack.com) on 2026-05-30. Email: Rubin-Q.S@rsqs.net. Program: Affiliate. Application received, waiting for monday.com review.'
}).eq('program_name', 'Monday.com Affiliate Program');

if (error) console.log('ERROR:', error.message);
else console.log('Monday.com updated to submitted');

// Final status of all 5
const { data } = await supabase.from('affiliate_programs')
  .select('program_name, status')
  .in('program_name', [
    'Writesonic Affiliate Program',
    'ElevenLabs Affiliate Program', 
    'ClickUp Affiliate Program',
    'Webflow Affiliate Program',
    'Monday.com Affiliate Program'
  ]);

console.log('\n=== FINAL STATUS ===');
for (const p of data) console.log(`${p.program_name}: ${p.status}`);
