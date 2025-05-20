/**
 * This script fixes the orders table schema to match what the application expects
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

async function renameColumn(tableName, oldColumnName, newColumnName) {
  try {
    // Check if the old column exists and the new one doesn't
    const oldColumnExists = await columnExists(tableName, oldColumnName);
    const newColumnExists = await columnExists(tableName, newColumnName);
    
    if (oldColumnExists && !newColumnExists) {
      // Rename the column
      await executeQuery(
        `ALTER TABLE ${tableName} RENAME COLUMN ${oldColumnName} TO ${newColumnName};`
      );
      console.log(`Successfully renamed column ${oldColumnName} to ${newColumnName} in ${tableName}`);
    } else if (!oldColumnExists) {
      console.log(`Column ${oldColumnName} doesn't exist in ${tableName}`);
    } else if (newColumnExists) {
      console.log(`Column ${newColumnName} already exists in ${tableName}`);
    }
  } catch (error) {
    console.error(`Error renaming column ${oldColumnName} to ${newColumnName}:`, error);
  }
}

async function addColumn(tableName, columnName, columnDefinition) {
  try {
    // Check if the column already exists
    const exists = await columnExists(tableName, columnName);
    
    if (!exists) {
      // Add the column
      await executeQuery(
        `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`
      );
      console.log(`Successfully added column ${columnName} to ${tableName}`);
    } else {
      console.log(`Column ${columnName} already exists in ${tableName}`);
    }
  } catch (error) {
    console.error(`Error adding column ${columnName} to ${tableName}:`, error);
  }
}

async function dropColumn(tableName, columnName) {
  try {
    // Check if the column exists
    const exists = await columnExists(tableName, columnName);
    
    if (exists) {
      // Drop the column
      await executeQuery(
        `ALTER TABLE ${tableName} DROP COLUMN ${columnName};`
      );
      console.log(`Successfully dropped column ${columnName} from ${tableName}`);
    } else {
      console.log(`Column ${columnName} doesn't exist in ${tableName}`);
    }
  } catch (error) {
    console.error(`Error dropping column ${columnName} from ${tableName}:`, error);
  }
}

async function fixOrdersTable() {
  try {
    console.log('Fixing orders table schema...');
    
    // Define the columns the application expects
    const expectedColumns = {
      'id': 'SERIAL PRIMARY KEY',
      'order_number': 'TEXT NOT NULL',
      'customer_id': 'INTEGER NOT NULL',
      'status': 'TEXT NOT NULL DEFAULT \'pending\'',
      'submission_date': 'TIMESTAMP DEFAULT NOW() NOT NULL',
      'total_amount': 'INTEGER',
      'payout_amount': 'INTEGER',
      'tracking_code': 'TEXT',
      'shipping_address': 'TEXT',
      'shipping_city': 'TEXT',
      'shipping_state': 'TEXT',
      'shipping_postal_code': 'TEXT',
      'shipping_country': 'TEXT',
      'notes': 'TEXT'
    };
    
    // Add any missing columns
    for (const [columnName, columnDefinition] of Object.entries(expectedColumns)) {
      await addColumn('orders', columnName, columnDefinition);
    }
    
    // Handle renamed columns if they exist in the current schema
    const possibleRenames = [
      ['total_value', 'total_amount'],
      ['total_payout', 'payout_amount']
    ];
    
    for (const [oldName, newName] of possibleRenames) {
      const oldExists = await columnExists('orders', oldName);
      const newExists = await columnExists('orders', newName);
      
      if (oldExists && !newExists) {
        await renameColumn('orders', oldName, newName);
      } else if (oldExists && newExists) {
        // If both exist, copy data from old to new and drop old
        await executeQuery(`
          UPDATE orders SET ${newName} = ${oldName} 
          WHERE ${newName} IS NULL AND ${oldName} IS NOT NULL;
        `);
        await dropColumn('orders', oldName);
      }
    }
    
    console.log('Orders table schema fixed successfully');
    
  } catch (error) {
    console.error('Error fixing orders table:', error);
  }
}

async function main() {
  try {
    await fixOrdersTable();
    console.log('Orders table fix completed successfully');
  } catch (error) {
    console.error('Error in main execution:', error);
  } finally {
    pool.end();
  }
}

// Run the script
main();