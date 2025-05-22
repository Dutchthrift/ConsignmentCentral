import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportData() {
  console.log('Exporting data from Supabase...');
  
  try {
    // Get users
    console.log('Fetching users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
    } else {
      console.log(`Found ${users.length} users`);
      // Mask password hashes for security
      const sanitizedUsers = users.map(user => ({
        ...user,
        password_hash: '[REDACTED]'
      }));
      fs.writeFileSync('users-export.json', JSON.stringify(sanitizedUsers, null, 2));
    }
    
    // Get customers
    console.log('Fetching customers...');
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*');
    
    if (customersError) {
      console.error('Error fetching customers:', customersError);
    } else {
      console.log(`Found ${customers.length} customers`);
      // Mask password hashes for security
      const sanitizedCustomers = customers.map(customer => ({
        ...customer,
        password_hash: '[REDACTED]'
      }));
      fs.writeFileSync('customers-export.json', JSON.stringify(sanitizedCustomers, null, 2));
    }
    
    // Get orders
    console.log('Fetching orders...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*');
    
    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
    } else {
      console.log(`Found ${orders.length} orders`);
      fs.writeFileSync('orders-export.json', JSON.stringify(orders, null, 2));
    }
    
    // Get items
    console.log('Fetching items...');
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*');
    
    if (itemsError) {
      console.error('Error fetching items:', itemsError);
    } else {
      console.log(`Found ${items.length} items`);
      fs.writeFileSync('items-export.json', JSON.stringify(items, null, 2));
    }
    
    // Creating combined export with relationships
    console.log('Creating combined export...');
    
    // Build relationships
    const ordersWithItems = [...(orders || [])];
    
    // Add items to each order
    for (const order of ordersWithItems) {
      order.items = (items || []).filter(item => item.order_id === order.id);
      
      // Find customer for this order
      order.customer = (customers || []).find(customer => customer.id === order.customer_id);
      if (order.customer) {
        order.customer = { ...order.customer, password_hash: '[REDACTED]' };
      }
    }
    
    // Final export data structure
    const exportData = {
      users: (users || []).map(user => ({ ...user, password_hash: '[REDACTED]' })),
      customers: (customers || []).map(customer => ({ ...customer, password_hash: '[REDACTED]' })),
      orders: ordersWithItems,
      items: items || [],
      summary: {
        userCount: (users || []).length,
        customerCount: (customers || []).length,
        orderCount: (orders || []).length,
        itemCount: (items || []).length,
        totalItemValue: (items || []).reduce((sum, item) => sum + Number(item.estimated_value || 0), 0),
        totalPayoutValue: (items || []).reduce((sum, item) => sum + Number(item.payout_value || 0), 0),
      }
    };
    
    fs.writeFileSync('complete-export.json', JSON.stringify(exportData, null, 2));
    console.log('Data export completed successfully!');
    
    // Print summary
    console.log('\nDatabase Summary:');
    console.log('----------------');
    console.log(`Users: ${exportData.summary.userCount}`);
    console.log(`Customers: ${exportData.summary.customerCount}`);
    console.log(`Orders: ${exportData.summary.orderCount}`);
    console.log(`Items: ${exportData.summary.itemCount}`);
    console.log(`Total Item Value: €${exportData.summary.totalItemValue.toFixed(2)}`);
    console.log(`Total Payout Value: €${exportData.summary.totalPayoutValue.toFixed(2)}`);
    console.log('\nYou can view the full data in the exported JSON files.');
    
  } catch (error) {
    console.error('Unexpected error during export:', error);
  }
}

// Run the export
exportData();