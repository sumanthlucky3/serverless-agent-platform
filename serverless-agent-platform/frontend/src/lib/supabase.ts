import { createClient } from '@supabase/supabase-js';

// Hardcoded to ensure the frontend uses the correct public anon key instead of a secret service role key
const supabaseUrl = 'https://taorulcsptltgjwcrxuu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhb3J1bGNzcHRsdGdqd2NyeHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MDAwNjAsImV4cCI6MjA5ODM3NjA2MH0.zJW33TFvlSliib26vHHmGcYBHo3s5ikOnRs1FTyPyQQ';

export const supabase = createClient(supabaseUrl, supabaseKey);
