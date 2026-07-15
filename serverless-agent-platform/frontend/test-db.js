import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDB() {
  console.log("Testing Supabase connection...");
  
  // 1. Fetch agents
  const { data: agents, error: err1 } = await supabase.from('agents').select('*');
  console.log("Agents:", agents?.length, err1 ? err1 : "OK");

  // 2. Fetch sessions
  const { data: sessions, error: err2 } = await supabase.from('agent_sessions').select('*');
  console.log("Sessions:", sessions?.length, err2 ? err2 : "OK");

  // 3. Try to insert a session
  console.log("Attempting to insert a test session...");
  const { data: newSession, error: err3 } = await supabase
    .from('agent_sessions')
    .insert({ agent_id: 'agent_general', title: 'Test Session', status: 'active' })
    .select('id')
    .single();
    
  if (err3) {
    console.error("INSERT FAILED:", err3);
  } else {
    console.log("INSERT SUCCESS! ID:", newSession.id);
    
    // Clean up
    await supabase.from('agent_sessions').delete().eq('id', newSession.id);
    console.log("Cleaned up test session.");
  }
}

testDB();
