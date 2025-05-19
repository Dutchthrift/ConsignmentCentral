/**
 * This script adds a test order for the logged-in consignor
 */
require('dotenv').config();
const { Pool } = require('pg');

// Connect to database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createTestOrder() {
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Get the customer ID for Theo Oenema
    const customerResult = await client.query(
      "SELECT id FROM customers WHERE email = 'theooenema@hotmail.com'"
    );
    
    if (customerResult.rows.length === 0) {
      throw new Error("Customer not found");
    }
    
    const customerId = customerResult.rows[0].id;
    console.log(`Found customer ID: ${customerId}`);
    
    // Create a unique order number
    const orderDate = new Date();
    const dateStr = orderDate.toISOString().substring(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `ORD-${dateStr}-${randomNum}`;
    
    // Insert order
    const orderResult = await client.query(
      `INSERT INTO orders 
       (customer_id, order_number, submission_date, status, total_value, total_payout, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id`,
      [
        customerId, 
        orderNumber, 
        orderDate, 
        'submitted', 
        15000, // €150.00 in cents
        7500,  // €75.00 in cents
        orderDate,
        orderDate
      ]
    );
    
    const orderId = orderResult.rows[0].id;
    console.log(`Created order ID: ${orderId} with order number: ${orderNumber}`);
    
    // Get some items from this customer to add to the order
    const itemsResult = await client.query(
      `SELECT id FROM items WHERE customer_id = $1 LIMIT 3`,
      [customerId]
    );
    
    if (itemsResult.rows.length === 0) {
      // Create a test item if no items exist
      const itemResult = await client.query(
        `INSERT INTO items 
         (customer_id, reference_id, name, description, status, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id`,
        [
          customerId,
          `ITEM-${dateStr}-${randomNum}`,
          'Vintage Leather Jacket',
          'Beautiful condition vintage leather jacket from the 1980s',
          'received',
          orderDate,
          orderDate
        ]
      );
      
      const itemId = itemResult.rows[0].id;
      console.log(`Created item ID: ${itemId}`);
      
      // Add item to order
      await client.query(
        `INSERT INTO order_items (order_id, item_id) VALUES ($1, $2)`,
        [orderId, itemId]
      );
      
      console.log(`Added item ${itemId} to order ${orderId}`);
    } else {
      // Add existing items to order
      for (const item of itemsResult.rows) {
        await client.query(
          `INSERT INTO order_items (order_id, item_id) VALUES ($1, $2)`,
          [orderId, item.id]
        );
        
        console.log(`Added item ${item.id} to order ${orderId}`);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`Successfully created test order ${orderNumber} with items`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating test order:', error);
  } finally {
    client.release();
  }
}

// Run the function
createTestOrder()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script error:', err);
    process.exit(1);
  });