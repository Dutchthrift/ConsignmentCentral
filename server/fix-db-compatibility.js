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
    
    // Check if image_urls column exists - if not, add it
    const columnExists = await executeQuery(
      "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='image_urls')"
    );
    
    if (!columnExists.rows[0].exists) {
      console.log('Adding image_urls column to items table');
      await executeQuery("ALTER TABLE items ADD COLUMN image_urls TEXT");
      console.log('Successfully added image_urls column');
    } else {
      console.log('image_urls column already exists');
    }
    
    // Verify image_url column
    const imageUrlExists = await executeQuery(
      "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='image_url')"
    );
    
    if (!imageUrlExists.rows[0].exists) {
      console.log('Adding image_url column to items table');
      await executeQuery("ALTER TABLE items ADD COLUMN image_url TEXT");
      console.log('Successfully added image_url column');
    } else {
      console.log('image_url column already exists');
    }
    
    // Make sure we have both columns to avoid future errors
    console.log('Items table columns have been checked and fixed if needed');
  } catch (error) {
    console.error('Error fixing items table:', error);
  }
}

async function fixAnalysisTable() {
  try {
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
        
        // Skip id as we can't add a primary key to an existing table this way
        if (column !== 'id') {
          await executeQuery(`ALTER TABLE analysis ADD COLUMN ${column} ${dataType}`);
          console.log(`Successfully added ${column} column`);
        }
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
    console.log('Database schema compatibility fixes completed successfully');
  } catch (error) {
    console.error('Error in main execution:', error);
  } finally {
    pool.end();
  }
}

// Run the script
main();