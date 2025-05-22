import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY in your .env file');
  process.exit(1);
}

// Using service role key is recommended for administrative operations, but we'll use the anon key here
const supabase = createClient(supabaseUrl, supabaseKey);

async function resetDatabase() {
  console.log('Starting database reset...');

  try {
    // First, let's check what tables exist
    const { data: tablesList, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.error('Error checking tables:', tablesError);
      console.log('Will try to drop tables assuming they exist...');
    } else {
      console.log('Existing tables:', tablesList.map(t => t.table_name).join(', '));
    }

    // Attempt to drop tables in order (to handle foreign key constraints)
    console.log('Dropping existing tables...');

    // Try to drop items table
    const { error: dropItemsError } = await supabase.rpc('pg_drop_table', { table_name: 'items' });
    if (dropItemsError) {
      console.log('Could not drop items table:', dropItemsError.message);
    } else {
      console.log('Items table dropped');
    }

    // Try to drop orders table
    const { error: dropOrdersError } = await supabase.rpc('pg_drop_table', { table_name: 'orders' });
    if (dropOrdersError) {
      console.log('Could not drop orders table:', dropOrdersError.message);
    } else {
      console.log('Orders table dropped');
    }

    // Try to drop customers table
    const { error: dropCustomersError } = await supabase.rpc('pg_drop_table', { table_name: 'customers' });
    if (dropCustomersError) {
      console.log('Could not drop customers table:', dropCustomersError.message);
    } else {
      console.log('Customers table dropped');
    }

    // Try to drop users table
    const { error: dropUsersError } = await supabase.rpc('pg_drop_table', { table_name: 'users' });
    if (dropUsersError) {
      console.log('Could not drop users table:', dropUsersError.message);
    } else {
      console.log('Users table dropped');
    }

    console.log('\nAll tables have been processed. You now need to run the provided SQL in the Supabase SQL Editor');
    console.log('Please run the following SQL in the Supabase SQL Editor:');

    // SQL for creating the tables
    const createTablesSql = `
-- Drop existing tables if they exist
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS users;

-- Create users table for admins
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customers table for consignors
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  total_estimated_value NUMERIC,
  total_payout_value NUMERIC,
  status TEXT DEFAULT 'awaiting_shipment',
  shipping_label_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create items table
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

-- Create helper function for dropping tables (useful for future resets)
CREATE OR REPLACE FUNCTION pg_drop_table(table_name text)
RETURNS void AS $$
BEGIN
  EXECUTE 'DROP TABLE IF EXISTS ' || table_name || ' CASCADE';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

    console.log(createTablesSql);
    console.log('\nAfter running the SQL above, run the seed-supabase-users.js script to add test data.');

  } catch (error) {
    console.error('Unexpected error during database reset:', error);
  }
}

resetDatabase();