import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const names = ['Writesonic', 'ElevenLabs', 'ClickUp', 'Webflow', 'Monday.com'];
for (const name of names) {
  const { data: prog } = await s.from('affiliate_programs').select('*').ilike('program_name', `%${name}%`).maybeSingle();
  if (prog) {
    console.log(`\n=== ${prog.program_name} ===`);
    console.log(`Status: ${prog.status}`);
    console.log(`Signup URL: ${prog.signup_url || 'NONE'}`);
    console.log(`Affiliate link: ${prog.affiliate_link || 'NONE'}`);
    console.log(`Notes: ${prog.notes || '-'}`);
    console.log(`Commission: ${prog.commission_details || '-'}`);
  }
}
