/**
 * Simple utility to directly log in as admin
 * Run this with: node admin-direct-login.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminLoginToken() {
  try {
    // Get admin user
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@test.com')
      .single();
    
    if (adminError || !adminUser) {
      console.error('Admin user not found:', adminError);
      return;
    }
    
    // Create a simple token
    const token = {
      id: adminUser.id,
      email: adminUser.email,
      userType: 'admin',
      timestamp: new Date().toISOString()
    };
    
    // Save token to file
    fs.writeFileSync('admin-token.json', JSON.stringify(token, null, 2));
    
    console.log('Admin token created successfully!');
    console.log('To log in as admin, run: node use-admin-token.js');
    
  } catch (error) {
    console.error('Error creating admin token:', error);
  }
}

createAdminLoginToken();