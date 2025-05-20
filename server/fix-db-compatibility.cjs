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
    console.log('Database schema compatibility fixes completed successfully');
  } catch (error) {
    console.error('Error in main execution:', error);
  } finally {
    pool.end();
  }
}

// Run the script
main();