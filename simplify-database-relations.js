/**
 * This script simplifies the database relations by ensuring each item
 * has a direct order_id reference, improving the item-order relationship model.
 */

import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();

// Configure connection (using WebSocket constructor as required by Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // @ts-ignore
  webSocketConstructor: ws
});

async function ensureItemOrderRelationships() {
  console.log('Starting database relation simplification...');
  
  try {
    // 1. Update items table with order_id from junction table if missing
    const updateQuery = `
      UPDATE items i
      SET order_id = oi.order_id
      FROM order_items oi
      WHERE i.id = oi.item_id AND (i.order_id IS NULL OR i.order_id != oi.order_id)
    `;
    
    const result = await pool.query(updateQuery);
    
    console.log(`Updated ${result.rowCount} items with correct order_id values`);
    
    // 2. Verify the relationships
    const verifyQuery = `
      SELECT i.id, i.title, i.order_id, oi.order_id as junction_order_id
      FROM items i
      LEFT JOIN order_items oi ON i.id = oi.item_id
      WHERE i.order_id IS NULL OR i.order_id != oi.order_id
    `;
    
    const verifyResult = await pool.query(verifyQuery);
    
    if (verifyResult.rows.length > 0) {
      console.log('Found inconsistencies in the following items:');
      console.table(verifyResult.rows);
    } else {
      console.log('✅ All item-order relationships are consistent');
    }
    
    // 3. Count items with and without orders
    const countQuery = `
      SELECT 
        COUNT(CASE WHEN order_id IS NOT NULL THEN 1 END) as items_with_order,
        COUNT(CASE WHEN order_id IS NULL THEN 1 END) as items_without_order
      FROM items
    `;
    
    const countResult = await pool.query(countQuery);
    console.log('Item counts:', countResult.rows[0]);
    
    return {
      success: true,
      updated: result.rowCount,
      inconsistencies: verifyResult.rows.length
    };
  } catch (error) {
    console.error('Error ensuring item-order relationships:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await pool.end();
  }
}

// Run the function
ensureItemOrderRelationships()
  .then(result => {
    console.log('Done:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });