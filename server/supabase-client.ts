import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Parse the DATABASE_URL to extract Supabase details
// Format: postgres://[user]:[password]@[host]:[port]/[db]
const getDatabaseInfo = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Extract host from URL
  const match = url.match(/postgres:\/\/.*:.*@([^:]+):/);
  const host = match ? match[1] : '';
  
  // For Supabase, the URL is typically in the format:
  // https://[project-id].supabase.co
  const supabaseUrl = `https://${host.replace('.neon.tech', '.supabase.co')}`;
  
  // The API key would typically come from the SUPABASE_KEY env var,
  // but if not available, we'll use a portion of the DB password
  const passwordMatch = url.match(/postgres:\/\/.*:(.*)@/);
  let apiKey = process.env.SUPABASE_KEY || '';
  
  if (!apiKey && passwordMatch) {
    // If no API key is provided, generate a temporary one from the password
    // Note: This is just a placeholder - in a real environment, use a proper API key
    apiKey = `${passwordMatch[1].slice(0, 20)}`;
  }
  
  return { supabaseUrl, apiKey };
};

// Create Supabase client
const { supabaseUrl, apiKey } = getDatabaseInfo();
export const supabase = createClient(supabaseUrl, apiKey, {
  auth: {
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

console.log(`Supabase client initialized: ${supabaseUrl}`);