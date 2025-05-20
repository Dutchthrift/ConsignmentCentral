/**
 * This script fixes the order_items table schema to ensure proper column naming
 */
require('dotenv').config();
const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function executeQuery(query, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
}

async function columnExists(tableName, columnName) {
  const query = `
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = $1 
      AND column_name = $2
    );
  `;
  
  const result = await executeQuery(query, [tableName, columnName]);
  return result.rows[0].exists;
}

async function tableExists(tableName) {
  const query = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = $1
    );
  `;
  
  const result = await executeQuery(query, [tableName]);
  return result.rows[0].exists;
}

async function fixOrderItemsTable() {
  try {
    console.log('Checking if order_items table exists...');
    
    const tableExistsResult = await tableExists('order_items');
    
    if (!tableExistsResult) {
      console.log('order_items table does not exist. Creating it...');
      
      await executeQuery(`
        CREATE TABLE order_items (
          id SERIAL PRIMARY KEY,
          order_id INTEGER NOT NULL REFERENCES orders(id),
          item_id INTEGER NOT NULL REFERENCES items(id),
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      console.log('order_items table created successfully');
      return;
    }
    
    console.log('order_items table exists. Checking columns...');
    
    // Check if the order_id column exists (snake_case version)
    const orderIdExists = await columnExists('order_items', 'order_id');
    const orderIdCamelExists = await columnExists('order_items', 'orderId');
    
    // Check if the item_id column exists (snake_case version)
    const itemIdExists = await columnExists('order_items', 'item_id');
    const itemIdCamelExists = await columnExists('order_items', 'itemId');
    
    if (!orderIdExists && !orderIdCamelExists) {
      console.log('Adding order_id column to order_items table');
      await executeQuery(`ALTER TABLE order_items ADD COLUMN order_id INTEGER NOT NULL REFERENCES orders(id);`);
    } else if (!orderIdExists && orderIdCamelExists) {
      console.log('Renaming orderId column to order_id');
      await executeQuery(`ALTER TABLE order_items RENAME COLUMN "orderId" TO order_id;`);
    }
    
    if (!itemIdExists && !itemIdCamelExists) {
      console.log('Adding item_id column to order_items table');
      await executeQuery(`ALTER TABLE order_items ADD COLUMN item_id INTEGER NOT NULL REFERENCES items(id);`);
    } else if (!itemIdExists && itemIdCamelExists) {
      console.log('Renaming itemId column to item_id');
      await executeQuery(`ALTER TABLE order_items RENAME COLUMN "itemId" TO item_id;`);
    }
    
    console.log('order_items table schema fixed successfully');
    
  } catch (error) {
    console.error('Error fixing order_items table:', error);
  }
}

async function main() {
  try {
    await fixOrderItemsTable();
    console.log('Order items table fix completed successfully');
  } catch (error) {
    console.error('Error in main execution:', error);
  } finally {
    pool.end();
  }
}

// Run the script
main();