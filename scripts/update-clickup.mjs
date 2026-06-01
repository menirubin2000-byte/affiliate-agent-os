import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Update ClickUp status
const { error } = await supabase
  .from('affiliate_programs')
  .update({ 
    status: 'submitted',
    notes: 'Applied via PartnerStack on 2026-05-30. Email: Rubin-Q.S@rsqs.net. Waiting for ClickUp approval.'
  })
  .eq('program_name', 'ClickUp Affiliate Program');

if (error) console.log('ERROR:', error.message);
else console.log('ClickUp updated to submitted');

// Check all 5
const { data: programs } = await supabase
  .from('affiliate_programs')
  .select('program_name, status')
  .in('program_name', [
    'Writesonic Affiliate Program',
    'ElevenLabs Affiliate Program', 
    'ClickUp Affiliate Program',
    'Webflow Affiliate Program',
    'Monday.com Affiliate Program'
  ]);

for (const p of programs) console.log(`${p.program_name}: ${p.status}`);
