/**
 * This script fixes the order-item relationships by linking existing items
 * to the orders displayed in the interface.
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

// Ensure DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for SSL connections to Supabase
  }
});

async function executeQuery(query, params = [], retries = 3) {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      return result;
    } finally {
      client.release();
    }
  } catch (error) {
    if (retries > 0) {
      console.warn(`Query failed, retrying... (${retries} attempts left)`);
      console.error('Error:', error.message);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return executeQuery(query, params, retries - 1);
    }
    throw error;
  }
}

async function getOrders() {
  console.log('Fetching existing orders...');
  const result = await executeQuery(`
    SELECT id, order_number, customer_id, status FROM orders 
    ORDER BY submission_date DESC
  `);
  
  return result.rows;
}

async function getItems() {
  console.log('Fetching available items...');
  const result = await executeQuery(`
    SELECT id, customer_id, status, title FROM items
    WHERE status IN ('sold', 'shipped', 'completed', 'returned')
  `);
  
  return result.rows;
}

async function checkOrderItems() {
  console.log('Checking existing order-item relationships...');
  const result = await executeQuery(`
    SELECT order_id, COUNT(item_id) as item_count
    FROM order_items
    GROUP BY order_id
  `);
  
  return result.rows;
}

async function associateItemsWithOrders() {
  try {
    // Get all orders
    const orders = await getOrders();
    console.log(`Found ${orders.length} orders`);
    
    // Get all items
    const items = await getItems();
    console.log(`Found ${items.length} items with 'sold', 'shipped', 'completed', or 'returned' status`);
    
    // Check existing order-item relationships
    const orderItemCounts = await checkOrderItems();
    const orderItemMap = orderItemCounts.reduce((map, row) => {
      map[row.order_id] = row.item_count;
      return map;
    }, {});
    
    // Process each order
    for (const order of orders) {
      const itemCount = orderItemMap[order.id] || 0;
      
      if (itemCount === 0) {
        console.log(`Order ${order.id} (${order.order_number}) has no items. Adding items...`);
        
        // Find items that belong to the same customer
        const customerItems = items.filter(item => item.customer_id === order.customer_id);
        
        if (customerItems.length === 0) {
          console.log(`No eligible items found for customer ${order.customer_id}`);
          continue;
        }
        
        // Take up to 3 items to associate with this order
        const itemsToAdd = customerItems.slice(0, 3);
        console.log(`Adding ${itemsToAdd.length} items to order ${order.id}`);
        
        for (const item of itemsToAdd) {
          // Check if this item is already associated with any order
          const checkResult = await executeQuery(`
            SELECT * FROM order_items WHERE item_id = $1
          `, [item.id]);
          
          if (checkResult.rows.length === 0) {
            // Associate item with order
            await executeQuery(`
              INSERT INTO order_items (order_id, item_id, created_at)
              VALUES ($1, $2, NOW())
            `, [order.id, item.id]);
            
            console.log(`Added item ${item.id} (${item.title}) to order ${order.id}`);
            
            // Update the item status to match the order status
            await executeQuery(`
              UPDATE items SET status = $1 WHERE id = $2
            `, [order.status, item.id]);
            
            console.log(`Updated item ${item.id} status to '${order.status}'`);
          } else {
            console.log(`Item ${item.id} is already associated with an order, skipping`);
          }
        }
        
        // Update order value based on the added items
        await executeQuery(`
          UPDATE orders 
          SET total_value = (
            SELECT COALESCE(SUM(p.suggested_listing_price), 0)
            FROM order_items oi
            JOIN items i ON oi.item_id = i.id
            LEFT JOIN pricing p ON i.id = p.item_id
            WHERE oi.order_id = $1
          ),
          total_payout = (
            SELECT COALESCE(SUM(p.suggested_payout), 0)
            FROM order_items oi
            JOIN items i ON oi.item_id = i.id
            LEFT JOIN pricing p ON i.id = p.item_id
            WHERE oi.order_id = $1
          )
          WHERE id = $1
        `, [order.id]);
        
        console.log(`Updated order ${order.id} value based on added items`);
      } else {
        console.log(`Order ${order.id} already has ${itemCount} items, skipping`);
      }
    }
    
    console.log('Order-item association process completed successfully');
  } catch (error) {
    console.error('Error associating items with orders:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('Starting to fix order-item relationships...');
    await associateItemsWithOrders();
    console.log('Successfully fixed order-item relationships');
  } catch (error) {
    console.error('Error fixing order-item relationships:', error);
  } finally {
    await pool.end();
  }
}

// Execute the main function
main();