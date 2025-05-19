/**
 * This script fixes the orders functionality by:
 * 1. Adding the missing columns to the orders table if they don't exist
 * 2. Linking the consignor user to their customer account
 * 3. Creating test orders for the demo consignor
 */
import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

// Create a connection pool using environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function executeQuery(query, params = [], retries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await pool.query(query, params);
      return result;
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      lastError = error;
      
      // Wait a bit before retrying
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  throw lastError;
}

async function columnExists(tableName, columnName) {
  const query = `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = $1 
    AND column_name = $2
  `;
  
  const result = await executeQuery(query, [tableName, columnName]);
  return result.rows.length > 0;
}

async function fixOrdersTable() {
  console.log("Checking orders table structure...");
  
  // Check if total_value and total_payout columns exist
  const hasValueColumn = await columnExists('orders', 'total_value');
  const hasPayoutColumn = await columnExists('orders', 'total_payout');
  const hasAmountColumn = await columnExists('orders', 'total_amount');
  
  if (!hasValueColumn) {
    console.log("Adding total_value column to orders table");
    await executeQuery(`
      ALTER TABLE orders
      ADD COLUMN total_value INTEGER
    `);
  }
  
  if (!hasPayoutColumn) {
    console.log("Adding total_payout column to orders table");
    await executeQuery(`
      ALTER TABLE orders
      ADD COLUMN total_payout INTEGER
    `);
  }
  
  // If we have a total_amount column but no total_value, migrate the data
  if (hasAmountColumn && !hasValueColumn) {
    console.log("Copying data from total_amount to total_value");
    await executeQuery(`
      UPDATE orders
      SET total_value = total_amount
      WHERE total_value IS NULL AND total_amount IS NOT NULL
    `);
  }
  
  console.log("Orders table structure updated successfully");
}

async function linkUsersToCustomers() {
  console.log("Linking consignor users to customer accounts...");
  
  // Find users with role 'consignor' that don't have a customer_id
  const usersResult = await executeQuery(`
    SELECT id, email, name 
    FROM users 
    WHERE role = 'consignor' AND customer_id IS NULL
  `);
  
  for (const user of usersResult.rows) {
    // Look for a matching customer by email
    const customerResult = await executeQuery(`
      SELECT id, email, name
      FROM customers
      WHERE email = $1
    `, [user.email]);
    
    if (customerResult.rows.length > 0) {
      const customer = customerResult.rows[0];
      console.log(`Linking user ${user.email} to customer account ${customer.id}`);
      
      // Update the user with the customer_id
      await executeQuery(`
        UPDATE users
        SET customer_id = $1
        WHERE id = $2
      `, [customer.id, user.id]);
    } else {
      console.log(`No matching customer found for user ${user.email}`);
    }
  }
  
  console.log("User-customer linking completed");
}

async function createTestOrders() {
  console.log("Creating test orders...");
  
  // Get all consignors
  const customersResult = await executeQuery(`
    SELECT id, email, name
    FROM customers
    WHERE role = 'consignor'
  `);
  
  for (const customer of customersResult.rows) {
    // Check if this customer already has orders
    const ordersResult = await executeQuery(`
      SELECT COUNT(*) as order_count
      FROM orders
      WHERE customer_id = $1
    `, [customer.id]);
    
    if (parseInt(ordersResult.rows[0].order_count) > 0) {
      console.log(`Customer ${customer.email} already has orders, skipping`);
      continue;
    }
    
    // Get the customer's items
    const itemsResult = await executeQuery(`
      SELECT id, title, status, reference_id
      FROM items
      WHERE customer_id = $1
    `, [customer.id]);
    
    if (itemsResult.rows.length === 0) {
      console.log(`No items found for customer ${customer.email}, skipping`);
      continue;
    }
    
    // Create a unique order number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `ORD-${dateStr}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    // Calculate totals based on pricing data
    let totalValue = 0;
    let totalPayout = 0;
    
    for (const item of itemsResult.rows) {
      // Check if pricing exists for this item
      const pricingResult = await executeQuery(`
        SELECT suggested_listing_price, suggested_payout
        FROM pricing
        WHERE item_id = $1
      `, [item.id]);
      
      if (pricingResult.rows.length > 0) {
        const pricing = pricingResult.rows[0];
        totalValue += parseInt(pricing.suggested_listing_price) || 0;
        totalPayout += parseInt(pricing.suggested_payout) || 0;
      }
    }
    
    // Create the order
    console.log(`Creating order ${orderNumber} for customer ${customer.email} with ${itemsResult.rows.length} items`);
    
    const orderResult = await executeQuery(`
      INSERT INTO orders (
        order_number, customer_id, status, submission_date, 
        total_value, total_payout, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
    `, [
      orderNumber,
      customer.id,
      'processing',
      today,
      totalValue || 0,
      totalPayout || 0,
      'Test order created by system',
      today
    ]);
    
    const orderId = orderResult.rows[0].id;
    
    // Link items to the order
    for (const item of itemsResult.rows) {
      await executeQuery(`
        INSERT INTO order_items (order_id, item_id, created_at) 
        VALUES ($1, $2, $3)
      `, [
        orderId,
        item.id,
        today
      ]);
      
      console.log(`Added item ${item.reference_id} to order ${orderNumber}`);
    }
    
    console.log(`✅ Created order ${orderNumber} with ${itemsResult.rows.length} items`);
  }
  
  console.log("Test orders created successfully");
}

// Main function
async function main() {
  try {
    console.log("Starting order system fixes...");
    
    // Fix the orders table
    await fixOrdersTable();
    
    // Link consignor users to customer accounts
    await linkUsersToCustomers();
    
    // Create test orders
    await createTestOrders();
    
    console.log("✅ All fixes completed successfully");
  } catch (error) {
    console.error("Error fixing order system:", error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Execute the main function
main();