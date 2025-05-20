/**
 * This script fixes the items table schema by ensuring the order_id column exists
 * and is properly referenced across all database connections.
 */

import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

async function fixItemsSchema() {
  console.log('Starting items table schema fix...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Check if the order_id column exists in items table
    const checkColumnQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'items' AND column_name = 'order_id'
    `;
    
    const columnCheck = await pool.query(checkColumnQuery);
    const orderIdColumnExists = columnCheck.rows.length > 0;
    
    if (!orderIdColumnExists) {
      console.log('Adding order_id column to items table...');
      
      // Begin transaction to ensure schema changes are atomic
      await pool.query('BEGIN');
      
      try {
        // Add order_id column to items table
        const addColumnQuery = `
          ALTER TABLE items 
          ADD COLUMN order_id INTEGER REFERENCES orders(id)
        `;
        await pool.query(addColumnQuery);
        console.log('Successfully added order_id column');
        
        // Update items table with order_id from junction table if missing
        const updateQuery = `
          UPDATE items i
          SET order_id = oi.order_id
          FROM order_items oi
          WHERE i.id = oi.item_id AND (i.order_id IS NULL OR i.order_id != oi.order_id)
        `;
        
        const result = await pool.query(updateQuery);
        console.log(`Updated ${result.rowCount} items with correct order_id values`);
        
        // Commit the transaction
        await pool.query('COMMIT');
        console.log('Transaction committed successfully');
      } catch (error) {
        // Rollback transaction on error
        await pool.query('ROLLBACK');
        console.error('Error in transaction, rolled back changes:', error);
        throw error;
      }
    } else {
      console.log('order_id column already exists in items table');
      
      // Check if the foreign key constraint exists
      const checkConstraintQuery = `
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'items' 
        AND ccu.column_name = 'order_id' 
        AND tc.constraint_type = 'FOREIGN KEY'
      `;
      
      const constraintCheck = await pool.query(checkConstraintQuery);
      const constraintExists = constraintCheck.rows.length > 0;
      
      if (!constraintExists) {
        console.log('Adding foreign key constraint for order_id column...');
        
        // Add foreign key constraint
        const addConstraintQuery = `
          ALTER TABLE items
          ADD CONSTRAINT items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id)
        `;
        await pool.query(addConstraintQuery);
        console.log('Successfully added foreign key constraint');
      } else {
        console.log('Foreign key constraint already exists for order_id column');
      }
    }
    
    // Verify the items table structure
    const verifyTableQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'items'
      ORDER BY ordinal_position
    `;
    
    const tableStructure = await pool.query(verifyTableQuery);
    console.log('Items table structure:');
    console.table(tableStructure.rows);
    
    // Verify items with order IDs count
    const countQuery = `
      SELECT 
        COUNT(CASE WHEN order_id IS NOT NULL THEN 1 END) as items_with_order,
        COUNT(CASE WHEN order_id IS NULL THEN 1 END) as items_without_order
      FROM items
    `;
    
    const countResult = await pool.query(countQuery);
    console.log('Item counts:', countResult.rows[0]);
    
    console.log('Items table schema fix completed successfully.');
    return true;
  } catch (error) {
    console.error('Error fixing items table schema:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Run the function
fixItemsSchema()
  .then(success => {
    if (success) {
      console.log('Schema fix completed successfully');
      process.exit(0);
    } else {
      console.error('Schema fix failed');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });