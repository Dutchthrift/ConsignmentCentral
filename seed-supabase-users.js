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

// Seed users
async function seedUsers() {
  console.log('Seeding Supabase with test users...');
  
  try {
    // 1. Create admin user
    const adminPassword = await hashPassword('adminpass123');
    const { data: adminData, error: adminError } = await supabase
      .from('users')
      .insert({
        email: 'admin@test.com',
        password_hash: adminPassword,
        role: 'admin',
      })
      .select();
      
    if (adminError) {
      if (adminError.message.includes('duplicate')) {
        console.log('Admin user already exists');
      } else {
        console.error('Error creating admin user:', adminError);
      }
    } else {
      console.log('Admin user created:', adminData[0].email);
    }
    
    // 2. Create consignor user
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
      if (consignorError.message.includes('duplicate')) {
        console.log('Consignor user already exists');
        
        // Get existing consignor
        const { data: existingConsignor } = await supabase
          .from('customers')
          .select('*')
          .eq('email', 'consignor@test.com')
          .single();
          
        if (existingConsignor) {
          console.log('Using existing consignor:', existingConsignor.email);
          await createSampleOrder(existingConsignor.id);
        }
      } else {
        console.error('Error creating consignor user:', consignorError);
      }
    } else {
      console.log('Consignor user created:', consignorData[0].email);
      
      // Create a sample order for the new consignor
      await createSampleOrder(consignorData[0].id);
    }
    
    console.log('Database seeding completed!');
    
  } catch (error) {
    console.error('Unexpected error during user seeding:', error);
  }
}

// Create a sample order with items for a consignor
async function createSampleOrder(customerId) {
  console.log('Creating sample order for customer ID:', customerId);
  
  // Create order
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
    return;
  }
  
  console.log('Sample order created with ID:', orderData[0].id);
  
  // Create sample items
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
  
  const { data: itemsData, error: itemsInsertError } = await supabase
    .from('items')
    .insert(sampleItems)
    .select();
    
  if (itemsInsertError) {
    console.error('Error creating sample items:', itemsInsertError);
    return;
  }
  
  console.log(`Created ${itemsData.length} sample items`);
  
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
    console.log('Order totals updated successfully');
  }
}

// Run the seeding function
seedUsers();