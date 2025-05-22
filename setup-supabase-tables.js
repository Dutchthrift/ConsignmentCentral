import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to hash passwords
async function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

// Initialize the database
async function setupDatabase() {
  console.log('Starting Supabase database setup...');
  
  try {
    // 1. Check if tables already exist
    console.log('Checking existing tables...');
    
    // Create users table if it doesn't exist
    console.log('Creating users table...');
    const { error: createUsersError } = await supabase
      .from('users')
      .insert({
        email: 'admin@test.com',
        password_hash: await hashPassword('adminpass123'),
        role: 'admin'
      })
      .select();
    
    if (createUsersError) {
      if (createUsersError.message.includes('does not exist')) {
        console.log('Users table does not exist. You need to create it first in Supabase.');
        console.log('Run the following SQL in the Supabase SQL Editor:');
        console.log(`
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
        `);
      } else if (createUsersError.message.includes('duplicate')) {
        console.log('Admin user already exists');
      } else {
        console.error('Error with users table:', createUsersError);
      }
    } else {
      console.log('Admin user created successfully');
    }
    
    // Create customers table if it doesn't exist
    console.log('Creating customers table...');
    const { error: createCustomersError } = await supabase
      .from('customers')
      .insert({
        email: 'consignor@test.com',
        password_hash: await hashPassword('consignorpass123'),
        name: 'Test Consignor'
      })
      .select();
    
    if (createCustomersError) {
      if (createCustomersError.message.includes('does not exist')) {
        console.log('Customers table does not exist. You need to create it first in Supabase.');
        console.log('Run the following SQL in the Supabase SQL Editor:');
        console.log(`
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
        `);
      } else if (createCustomersError.message.includes('duplicate')) {
        console.log('Consignor user already exists');
      } else {
        console.error('Error with customers table:', createCustomersError);
      }
    } else {
      console.log('Consignor user created successfully');
    }
    
    // Create orders table if it doesn't exist
    console.log('Checking orders table...');
    const { error: ordersCheckError } = await supabase
      .from('orders')
      .select('id')
      .limit(1);
    
    if (ordersCheckError && ordersCheckError.message.includes('does not exist')) {
      console.log('Orders table does not exist. You need to create it first in Supabase.');
      console.log('Run the following SQL in the Supabase SQL Editor:');
      console.log(`
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  total_estimated_value NUMERIC,
  total_payout_value NUMERIC,
  status TEXT DEFAULT 'awaiting_shipment',
  shipping_label_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
      `);
    } else {
      console.log('Orders table exists');
    }
    
    // Create items table if it doesn't exist
    console.log('Checking items table...');
    const { error: itemsCheckError } = await supabase
      .from('items')
      .select('id')
      .limit(1);
    
    if (itemsCheckError && itemsCheckError.message.includes('does not exist')) {
      console.log('Items table does not exist. You need to create it first in Supabase.');
      console.log('Run the following SQL in the Supabase SQL Editor:');
      console.log(`
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  title TEXT,
  image_urls TEXT[],
  estimated_value NUMERIC,
  payout_value NUMERIC,
  commission_rate INTEGER,
  status TEXT DEFAULT 'quoted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
      `);
    } else {
      console.log('Items table exists');
    }
    
    console.log('\nDatabase setup guide complete!');
    console.log('\nPlease execute the SQL statements in the Supabase SQL Editor if any tables are missing.');
    console.log('\nThen restart this script to seed the database with test users.');
    
  } catch (error) {
    console.error('Unexpected error during database setup:', error);
  }
}

// Run the setup
setupDatabase();