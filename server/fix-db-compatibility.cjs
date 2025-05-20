/**
 * This script fixes database compatibility issues between the codebase and actual DB schema
 */

require('dotenv').config();
const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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

async function fixItemsTable() {
  try {
    console.log('Checking items table columns...');
    
    // Required columns for the items table
    const requiredColumns = [
      { name: 'image_urls', type: 'TEXT' },
      { name: 'image_url', type: 'TEXT' },
      { name: 'condition', type: 'TEXT' },
      { name: 'status', type: 'TEXT' },
      { name: 'customer_id', type: 'INTEGER' },
      { name: 'reference_id', type: 'TEXT' },
      { name: 'title', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'category', type: 'TEXT' }
    ];
    
    // Check each required column and add if missing
    for (const column of requiredColumns) {
      const columnExists = await executeQuery(
        `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='${column.name}')`
      );
      
      if (!columnExists.rows[0].exists) {
        console.log(`Adding ${column.name} column to items table`);
        await executeQuery(`ALTER TABLE items ADD COLUMN ${column.name} ${column.type}`);
        console.log(`Successfully added ${column.name} column`);
      } else {
        console.log(`${column.name} column already exists`);
      }
    }
    
    // Make sure we have both columns to avoid future errors
    console.log('Items table columns have been checked and fixed if needed');
  } catch (error) {
    console.error('Error fixing items table:', error);
  }
}

async function fixPricingTable() {
  try {
    console.log('Checking pricing table existence...');
    
    // First check if the pricing table exists, if not create it
    const tableExists = await executeQuery(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pricing')"
    );
    
    if (!tableExists.rows[0].exists) {
      console.log('Creating pricing table as it does not exist');
      await executeQuery(`
        CREATE TABLE pricing (
          id SERIAL PRIMARY KEY,
          item_id INTEGER NOT NULL,
          recommended_price NUMERIC,
          average_price NUMERIC,
          sale_price NUMERIC,
          commission_rate NUMERIC,
          commission_amount NUMERIC,
          payout_amount NUMERIC,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('Pricing table created successfully');
      return; // No need to check columns if we just created the table
    }
    
    console.log('Checking pricing table columns...');
    
    // Required columns for the pricing table
    const requiredColumns = [
      { name: 'item_id', type: 'INTEGER NOT NULL' },
      { name: 'recommended_price', type: 'NUMERIC' },
      { name: 'average_price', type: 'NUMERIC' },
      { name: 'sale_price', type: 'NUMERIC' },
      { name: 'commission_rate', type: 'NUMERIC' },
      { name: 'commission_amount', type: 'NUMERIC' },
      { name: 'payout_amount', type: 'NUMERIC' },
      { name: 'created_at', type: 'TIMESTAMP DEFAULT NOW()' }
    ];
    
    // Check each required column and add if missing
    for (const column of requiredColumns) {
      const columnExists = await executeQuery(
        `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pricing' AND column_name='${column.name}')`
      );
      
      if (!columnExists.rows[0].exists) {
        console.log(`Adding ${column.name} column to pricing table`);
        
        // Skip constraints for created_at field to avoid DEFAULT NOW() issues
        const columnType = column.name === 'created_at' ? 'TIMESTAMP' : column.type;
        
        await executeQuery(`ALTER TABLE pricing ADD COLUMN ${column.name} ${columnType}`);
        
        // Add default for timestamp separately
        if (column.name === 'created_at') {
          await executeQuery(`ALTER TABLE pricing ALTER COLUMN ${column.name} SET DEFAULT NOW()`);
        }
        
        console.log(`Successfully added ${column.name} column`);
      } else {
        console.log(`${column.name} column already exists`);
      }
    }
    
    console.log('Pricing table columns have been checked and fixed if needed');
  } catch (error) {
    console.error('Error fixing pricing table:', error);
  }
}

async function fixAnalysisTable() {
  try {
    console.log('Checking analysis table existence...');
    
    // First check if the analysis table exists, if not create it
    const tableExists = await executeQuery(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analysis')"
    );
    
    if (!tableExists.rows[0].exists) {
      console.log('Creating analysis table as it does not exist');
      await executeQuery(`
        CREATE TABLE analysis (
          id SERIAL PRIMARY KEY,
          item_id INTEGER NOT NULL,
          brand TEXT,
          product_type TEXT,
          model TEXT,
          condition TEXT,
          category TEXT,
          features JSONB,
          accessories TEXT,
          manufacture_year TEXT,
          color TEXT,
          dimensions TEXT,
          weight TEXT,
          materials TEXT,
          authenticity TEXT,
          rarity TEXT,
          additional_notes TEXT,
          analysis_summary TEXT,
          confidence_score NUMERIC,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('Analysis table created successfully');
      return; // No need to check columns if we just created the table
    }
    
    console.log('Checking analysis table columns...');
    
    // List of columns from the code schema
    const schemaColumns = [
      'id',
      'item_id',
      'brand',
      'product_type',
      'model',
      'condition',
      'category',
      'features',
      'accessories',
      'manufacture_year',
      'color',
      'dimensions',
      'weight',
      'materials',
      'authenticity',
      'rarity',
      'additional_notes',
      'analysis_summary',
      'confidence_score',
      'created_at'
    ];
    
    // Check each column, add if missing
    for (const column of schemaColumns) {
      // First check if the column exists
      const columnExists = await executeQuery(
        "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='analysis' AND column_name=$1)",
        [column]
      );
      
      if (!columnExists.rows[0].exists) {
        console.log(`Adding missing column ${column} to analysis table`);
        
        // Determine data type based on column name
        let dataType = 'TEXT';
        if (column === 'id') {
          dataType = 'SERIAL PRIMARY KEY';
        } else if (column === 'item_id') {
          dataType = 'INTEGER NOT NULL';
        } else if (column === 'confidence_score') {
          dataType = 'NUMERIC';
        } else if (column === 'created_at') {
          dataType = 'TIMESTAMP DEFAULT NOW()';
        } else if (column === 'features') {
          dataType = 'JSONB';
        }
        
        try {
          // Skip id as we can't add a primary key to an existing table this way
          if (column !== 'id') {
            await executeQuery(`ALTER TABLE analysis ADD COLUMN ${column} ${dataType}`);
            console.log(`Successfully added ${column} column`);
          }
        } catch (alterError) {
          console.error(`Error adding column ${column}:`, alterError);
        }
      } else {
        console.log(`Column ${column} already exists in analysis table`);
      }
    }
    
    console.log('Analysis table columns have been checked and fixed if needed');
  } catch (error) {
    console.error('Error fixing analysis table:', error);
  }
}

async function main() {
  try {
    await fixItemsTable();
    await fixAnalysisTable();
    await fixPricingTable();
    console.log('Database schema compatibility fixes completed successfully');
  } catch (error) {
    console.error('Error in main execution:', error);
  } finally {
    pool.end();
  }
}

// Run the script
main();