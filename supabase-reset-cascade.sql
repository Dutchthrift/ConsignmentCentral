-- Drop all tables with CASCADE to handle dependencies
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Create customers table for consignors
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table for admins
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
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