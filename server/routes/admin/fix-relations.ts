/**
 * Database Relationship Fix Route
 * Implements the admin-only endpoint to fix item-order relationships
 */

import { Router } from 'express';
import { Pool } from '@neondatabase/serverless';
import { requireAdmin } from '../../middleware/auth.middleware';

const router = Router();

// POST endpoint to fix the relations (admin-only)
router.post('/', requireAdmin, async (req, res) => {
  let pool;
  
  try {
    console.log('Starting to fix item-order relationships...');
    
    // Get a database client
    pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    // 1. First check if the order_id column exists in items table
    const checkColumnQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'items' AND column_name = 'order_id'
    `;
    
    const columnCheck = await pool.query(checkColumnQuery);
    const orderIdColumnExists = columnCheck.rows.length > 0;
    
    if (!orderIdColumnExists) {
      console.log('Adding order_id column to items table');
      const addColumnQuery = `
        ALTER TABLE items 
        ADD COLUMN order_id INTEGER REFERENCES orders(id)
      `;
      await pool.query(addColumnQuery);
      console.log('Successfully added order_id column');
    }
    
    // 2. Update items table with order_id from junction table if missing
    const updateQuery = `
      UPDATE items i
      SET order_id = oi.order_id
      FROM order_items oi
      WHERE i.id = oi.item_id AND (i.order_id IS NULL OR i.order_id != oi.order_id)
      RETURNING i.id
    `;
    
    const result = await pool.query(updateQuery);
    
    console.log(`Updated ${result.rowCount} items with correct order_id values`);
    
    // 3. Verify the relationships
    const verifyQuery = `
      SELECT i.id, i.title, i.order_id, oi.order_id as junction_order_id
      FROM items i
      LEFT JOIN order_items oi ON i.id = oi.item_id
      WHERE (oi.order_id IS NOT NULL) AND (i.order_id IS NULL OR i.order_id != oi.order_id)
    `;
    
    const verifyResult = await pool.query(verifyQuery);
    
    if (verifyResult.rows.length > 0) {
      console.log('Found inconsistencies in the following items:');
      console.table(verifyResult.rows);
    } else {
      console.log('✅ All item-order relationships are consistent');
    }
    
    // 4. Count items with and without orders
    const countQuery = `
      SELECT 
        COUNT(CASE WHEN order_id IS NOT NULL THEN 1 END) as items_with_order,
        COUNT(CASE WHEN order_id IS NULL THEN 1 END) as items_without_order
      FROM items
    `;
    
    const countResult = await pool.query(countQuery);
    console.log('Item counts:', countResult.rows[0]);
    
    // Ensure proper JSON response format
    res.setHeader('Content-Type', 'application/json');
    
    return res.json({
      success: true,
      updated: result.rowCount,
      inconsistencies: verifyResult.rows.length,
      counts: countResult.rows[0] || { items_with_order: 0, items_without_order: 0 },
      message: "Item-order relationships have been fixed"
    });
  } catch (error) {
    console.error('Error fixing item-order relationships:', error);
    
    // Ensure proper JSON response format even for errors
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: "Failed to fix item-order relationships"
    });
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch (poolError) {
        console.error('Error closing database pool:', poolError);
      }
    }
  }
});

export default router;