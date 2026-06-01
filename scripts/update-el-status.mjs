import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { error } = await supabase
  .from('affiliate_programs')
  .update({ 
    status: 'submitted',
    dashboard_url: 'https://af.uppromote.com/elevenlabs/dashboard',
    notes: 'Registered 2026-05-30. Email verified. Dashboard accessible at af.uppromote.com/elevenlabs/dashboard. Account status: Inactive. Waiting for ElevenLabs to activate and generate affiliate link.'
  })
  .eq('program_name', 'ElevenLabs Affiliate Program');

if (error) console.log('ERROR:', error.message);
else console.log('ElevenLabs updated OK');
