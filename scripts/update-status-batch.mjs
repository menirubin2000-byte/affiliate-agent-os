import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Update ClickUp
await supabase.from('affiliate_programs').update({ 
  status: 'submitted',
  notes: 'Applied via PartnerStack 2026-05-30. Email: Rubin-Q.S@rsqs.net. Waiting for ClickUp review.'
}).eq('program_name', 'ClickUp Affiliate Program');

// Update Webflow
await supabase.from('affiliate_programs').update({ 
  status: 'submitted',
  notes: 'Applied via PartnerStack 2026-05-30. Email: Rubin-Q.S@rsqs.net. Application received, waiting for Webflow review.'
}).eq('program_name', 'Webflow Affiliate Program');

// Check status of all 5
const { data } = await supabase.from('affiliate_programs')
  .select('program_name, status')
  .in('program_name', [
    'Writesonic Affiliate Program',
    'ElevenLabs Affiliate Program', 
    'ClickUp Affiliate Program',
    'Webflow Affiliate Program',
    'Monday.com Affiliate Program'
  ]);

for (const p of data) console.log(`${p.program_name}: ${p.status}`);
