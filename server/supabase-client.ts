/**
 * Supabase client configuration
 * This file sets up the Supabase client for database operations
 */
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Log initialization
console.log('Supabase client initialized with URL:', supabaseUrl);