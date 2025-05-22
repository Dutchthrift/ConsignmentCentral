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

// Seed users function with verbose logging
async function seedData() {
  console.log('Starting Supabase data seeding with verbose logging...');
  console.log(`Supabase URL: ${supabaseUrl}`);
  
  try {
    // First, check if tables exist
    console.log('Checking for users table...');
    const { error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (usersError) {
      console.error('Error accessing users table:', usersError);
      console.log('Tables might not exist yet. Please make sure you ran the SQL creation script.');
      return;
    }
    
    console.log('Users table access successful');
    
    // Create admin user
    console.log('Creating admin user...');
    const adminPassword = await hashPassword('adminpass123');
    
    const { data: adminData, error: adminError } = await supabase
      .from('users')
      .insert({
        email: 'admin@test.com',
        password_hash: adminPassword,
        role: 'admin'
      })
      .select();
    
    if (adminError) {
      console.error('Error creating admin user:', adminError);
    } else {
      console.log('Admin user created successfully:', adminData);
    }
    
    // Create consignor user
    console.log('Creating consignor user...');
    const consignorPassword = await hashPassword('consignorpass123');
    
    const { data: consignorData, error: consignorError } = await supabase
      .from('customers')
      .insert({
        email: 'consignor@test.com',
        password_hash: consignorPassword,
        name: 'Test Consignor'
      })
      .select();
    
    if (consignorError) {
      console.error('Error creating consignor user:', consignorError);
      return;
    }
    
    console.log('Consignor user created successfully:', consignorData);
    const customerId = consignorData[0].id;
    
    // Create an order for the consignor
    console.log(`Creating order for consignor ID: ${customerId}...`);
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        status: 'awaiting_shipment',
        total_estimated_value: 195,
        total_payout_value: 129
      })
      .select();
    
    if (orderError) {
      console.error('Error creating order:', orderError);
      return;
    }
    
    console.log('Order created successfully:', orderData);
    const orderId = orderData[0].id;
    
    // Create items for the order
    console.log(`Creating items for order ID: ${orderId}...`);
    const items = [
      {
        order_id: orderId,
        title: 'Vintage Denim Jacket',
        image_urls: ['https://example.com/jacket.jpg'],
        estimated_value: 75,
        payout_value: 45,
        commission_rate: 40,
        status: 'quoted'
      },
      {
        order_id: orderId,
        title: 'Designer Handbag',
        image_urls: ['https://example.com/handbag.jpg'],
        estimated_value: 120,
        payout_value: 84,
        commission_rate: 30,
        status: 'quoted'
      }
    ];
    
    const { data: itemsData, error: itemsError } = await supabase
      .from('items')
      .insert(items)
      .select();
    
    if (itemsError) {
      console.error('Error creating items:', itemsError);
      return;
    }
    
    console.log('Items created successfully:', itemsData);
    
    console.log('Seeding completed successfully!');
    
    // Verify the data exists
    console.log('\nVerifying data in Supabase...');
    
    // Check users
    const { data: usersData } = await supabase.from('users').select('*');
    console.log('Users:', usersData);
    
    // Check customers
    const { data: customersData } = await supabase.from('customers').select('*');
    console.log('Customers:', customersData);
    
    // Check orders
    const { data: ordersData } = await supabase.from('orders').select('*');
    console.log('Orders:', ordersData);
    
    // Check items
    const { data: allItemsData } = await supabase.from('items').select('*');
    console.log('Items:', allItemsData);
    
  } catch (error) {
    console.error('Unexpected error during seeding:', error);
  }
}

// Run the seed function
seedData();