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

const supabase = createClient(supabaseUrl, supabaseKey);

// Add orders and items for existing consignor
async function addOrdersAndItems() {
  console.log('Starting to add orders and items...');
  
  try {
    // Get the existing consignor by email
    console.log('Finding existing consignor...');
    const { data: consignorData, error: consignorError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', 'consignor@test.com')
      .single();
    
    if (consignorError) {
      console.error('Error finding consignor:', consignorError);
      return;
    }
    
    console.log('Found consignor:', consignorData);
    const customerId = consignorData.id;
    
    // Create sample orders for this consignor
    const orders = [
      {
        customer_id: customerId,
        status: 'awaiting_shipment',
        total_estimated_value: 195,
        total_payout_value: 129
      },
      {
        customer_id: customerId,
        status: 'processing',
        total_estimated_value: 250,
        total_payout_value: 175
      }
    ];
    
    console.log('Creating orders...');
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .insert(orders)
      .select();
    
    if (ordersError) {
      console.error('Error creating orders:', ordersError);
      return;
    }
    
    console.log('Created orders:', ordersData);
    
    // Create items for each order
    const items = [];
    
    // Items for first order
    items.push({
      order_id: ordersData[0].id,
      title: 'Vintage Denim Jacket',
      image_urls: ['https://example.com/jacket.jpg'],
      estimated_value: 75,
      payout_value: 45,
      commission_rate: 40,
      status: 'quoted'
    });
    
    items.push({
      order_id: ordersData[0].id,
      title: 'Designer Handbag',
      image_urls: ['https://example.com/handbag.jpg'],
      estimated_value: 120,
      payout_value: 84,
      commission_rate: 30,
      status: 'quoted'
    });
    
    // Items for second order
    items.push({
      order_id: ordersData[1].id,
      title: 'Luxury Watch',
      image_urls: ['https://example.com/watch.jpg'],
      estimated_value: 150,
      payout_value: 105,
      commission_rate: 30,
      status: 'quoted'
    });
    
    items.push({
      order_id: ordersData[1].id,
      title: 'Designer Shoes',
      image_urls: ['https://example.com/shoes.jpg'],
      estimated_value: 100,
      payout_value: 70,
      commission_rate: 30,
      status: 'quoted'
    });
    
    console.log('Creating items...');
    const { data: itemsData, error: itemsError } = await supabase
      .from('items')
      .insert(items)
      .select();
    
    if (itemsError) {
      console.error('Error creating items:', itemsError);
      return;
    }
    
    console.log('Created items:', itemsData);
    
    // Verify data in Supabase
    console.log('\nVerifying data in Supabase...');
    
    // Check all tables
    const { data: allCustomers } = await supabase.from('customers').select('*');
    console.log(`Total customers: ${allCustomers.length}`);
    
    const { data: allOrders } = await supabase.from('orders').select('*');
    console.log(`Total orders: ${allOrders.length}`);
    
    const { data: allItems } = await supabase.from('items').select('*');
    console.log(`Total items: ${allItems.length}`);
    
    console.log('Data seeding completed successfully!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the function
addOrdersAndItems();