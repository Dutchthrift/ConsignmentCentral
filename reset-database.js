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

// Drop and recreate all tables
async function resetDatabase() {
  console.log('Starting database reset...');
  
  try {
    // 1. Drop existing tables if they exist (in reverse order of dependencies)
    console.log('Dropping existing tables...');
    
    // We'll use raw SQL for this
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql_query: `
        DROP TABLE IF EXISTS items;
        DROP TABLE IF EXISTS orders;
        DROP TABLE IF EXISTS customers;
        DROP TABLE IF EXISTS users;
      `
    });
    
    if (dropError) {
      console.error('Error dropping tables:', dropError);
      return;
    }
    
    // 2. Create tables in order of dependencies
    console.log('Creating tables...');
    
    // Create customers table
    const { error: customersError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS customers (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `
    });
    
    if (customersError) {
      console.error('Error creating customers table:', customersError);
      return;
    }
    
    // Create users table
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'admin',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `
    });
    
    if (usersError) {
      console.error('Error creating users table:', usersError);
      return;
    }
    
    // Create orders table
    const { error: ordersError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS orders (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          customer_id UUID REFERENCES customers(id),
          total_estimated_value NUMERIC,
          total_payout_value NUMERIC,
          status TEXT DEFAULT 'awaiting_shipment',
          shipping_label_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `
    });
    
    if (ordersError) {
      console.error('Error creating orders table:', ordersError);
      return;
    }
    
    // Create items table
    const { error: itemsError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS items (
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
      `
    });
    
    if (itemsError) {
      console.error('Error creating items table:', itemsError);
      return;
    }
    
    console.log('All tables created successfully!');
    
    // 3. Create test accounts
    console.log('Creating test accounts...');
    
    // Create admin user
    const adminPassword = await hashPassword('adminpass123');
    const { error: adminError } = await supabase
      .from('users')
      .insert({
        email: 'admin@test.com',
        password_hash: adminPassword,
        role: 'admin',
      });
      
    if (adminError) {
      console.error('Error creating admin user:', adminError);
    } else {
      console.log('Admin user created: admin@test.com / adminpass123');
    }
    
    // Create consignor user
    const consignorPassword = await hashPassword('consignorpass123');
    const { data: consignorData, error: consignorError } = await supabase
      .from('customers')
      .insert({
        email: 'consignor@test.com',
        password_hash: consignorPassword,
        name: 'Test Consignor',
      })
      .select();
      
    if (consignorError) {
      console.error('Error creating consignor user:', consignorError);
    } else {
      console.log('Consignor user created: consignor@test.com / consignorpass123');
      
      // Create a sample order for the consignor
      const customerId = consignorData[0].id;
      
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          status: 'awaiting_shipment',
          total_estimated_value: 0,
          total_payout_value: 0,
        })
        .select();
        
      if (orderError) {
        console.error('Error creating sample order:', orderError);
      } else {
        console.log('Sample order created for consignor');
        
        // Create sample items for the order
        const orderId = orderData[0].id;
        const sampleItems = [
          {
            order_id: orderId,
            title: 'Vintage Denim Jacket',
            image_urls: ['https://example.com/jacket.jpg'],
            estimated_value: 75.00,
            payout_value: 45.00,
            commission_rate: 40,
            status: 'quoted',
          },
          {
            order_id: orderId,
            title: 'Designer Handbag',
            image_urls: ['https://example.com/handbag.jpg'],
            estimated_value: 120.00,
            payout_value: 84.00,
            commission_rate: 30,
            status: 'quoted',
          }
        ];
        
        const { error: itemsInsertError } = await supabase
          .from('items')
          .insert(sampleItems);
          
        if (itemsInsertError) {
          console.error('Error creating sample items:', itemsInsertError);
        } else {
          console.log('Sample items created for order');
        }
        
        // Update order totals
        const totalEstimatedValue = sampleItems.reduce((sum, item) => sum + item.estimated_value, 0);
        const totalPayoutValue = sampleItems.reduce((sum, item) => sum + item.payout_value, 0);
        
        const { error: updateOrderError } = await supabase
          .from('orders')
          .update({
            total_estimated_value: totalEstimatedValue,
            total_payout_value: totalPayoutValue,
          })
          .eq('id', orderId);
          
        if (updateOrderError) {
          console.error('Error updating order totals:', updateOrderError);
        } else {
          console.log('Order totals updated');
        }
      }
    }
    
    console.log('Database reset complete!');
    
  } catch (error) {
    console.error('Unexpected error during database reset:', error);
  }
}

// Run the reset function
resetDatabase();