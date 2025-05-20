/**
 * This script fixes the analyses table by adding missing columns
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

async function fixAnalysesTable() {
  try {
    console.log('Fixing analyses table schema...');
    
    // Define the columns the application expects
    const expectedColumns = {
      'analysis_summary': 'TEXT',
      'confidence_score': 'NUMERIC(4,2)',
      'materials': 'TEXT',
      'authenticity': 'TEXT',
      'rarity': 'TEXT',
      'manufacture_year': 'TEXT',
      'color': 'TEXT',
      'dimensions': 'TEXT',
      'features': 'TEXT',
      'category': 'TEXT'
    };
    
    // Add any missing columns
    for (const [columnName, columnDefinition] of Object.entries(expectedColumns)) {
      await addColumn('analyses', columnName, columnDefinition);
    }
    
    console.log('Analyses table schema fixed successfully');
    
  } catch (error) {
    console.error('Error fixing analyses table:', error);
  }
}

async function main() {
  try {
    await fixAnalysesTable();
    console.log('Analyses table fix completed successfully');
  } catch (error) {
    console.error('Error in main execution:', error);
  } finally {
    pool.end();
  }
}

// Run the script
main();