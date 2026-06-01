import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Update ElevenLabs affiliate program status
const { data, error } = await supabase
  .from('affiliate_programs')
  .update({ 
    status: 'submitted',
    notes: 'Registered on af.uppromote.com/elevenlabs on 2026-05-30. Email verification sent to menirubin2000@gmail.com. Waiting for email verification + program approval.'
  })
  .eq('program_name', 'ElevenLabs Affiliate Program')
  .select();

if (error) {
  console.log('ERROR:', error.message);
} else {
  console.log('Updated ElevenLabs:', JSON.stringify(data, null, 2));
}

// Check all 5 program statuses
const { data: programs } = await supabase
  .from('affiliate_programs')
  .select('program_name, status, signup_url, notes')
  .in('program_name', [
    'Writesonic Affiliate Program',
    'ElevenLabs Affiliate Program', 
    'ClickUp Affiliate Program',
    'Webflow Affiliate Program',
    'Monday.com Affiliate Program'
  ]);

console.log('\n=== STATUS OF 5 PROGRAMS ===');
for (const p of programs) {
  console.log(`${p.program_name}: ${p.status}`);
}
