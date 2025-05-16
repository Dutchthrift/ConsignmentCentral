// Migration script to transfer data from Neon to Supabase
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

// Source database (Neon)
const sourcePool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 3,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000
});

// Target database (Supabase)
const targetPool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 3,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000
});

// Function to execute queries with better error handling
async function executeQuery(pool, query, params = [], retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        return await client.query(query, params);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`Attempt ${attempt}/${retries} failed:`, error.message);
      lastError = error;
      // Wait before retrying with exponential backoff
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// Tables to migrate in order (respecting foreign key dependencies)
const tablesToMigrate = [
  'users',
  'admin_users',
  'customers',
  'items',
  'ml_training_examples',
  'ml_model_configs',
  'ml_training_sessions',
  'orders',
  'order_items',
  'analysis',
  'pricing',
  'shipping'
];

// Main migration function
async function migrateData() {
  try {
    console.log('Starting migration from Neon to Supabase...');
    
    // Verify connections
    try {
      const sourceResult = await executeQuery(sourcePool, 'SELECT NOW() as time');
      console.log('Source database connected, current time:', sourceResult.rows[0].time);
      
      const targetResult = await executeQuery(targetPool, 'SELECT NOW() as time');
      console.log('Target database connected, current time:', targetResult.rows[0].time);
    } catch (error) {
      console.error('Failed to connect to databases:', error.message);
      return;
    }
    
    // Process each table
    for (const table of tablesToMigrate) {
      try {
        console.log(`Migrating table: ${table}`);
        
        // Get table schema
        const schemaQuery = `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
        `;
        const schemaResult = await executeQuery(sourcePool, schemaQuery, [table]);
        
        if (schemaResult.rows.length === 0) {
          console.log(`Table ${table} not found in source database, skipping...`);
          continue;
        }
        
        // Get column names
        const columns = schemaResult.rows.map(row => row.column_name);
        
        // Get data from source
        const sourceDataQuery = `SELECT * FROM ${table}`;
        const sourceData = await executeQuery(sourcePool, sourceDataQuery);
        console.log(`Found ${sourceData.rows.length} rows in ${table}`);
        
        // Skip if no data
        if (sourceData.rows.length === 0) {
          console.log(`No data in table ${table}, skipping...`);
          continue;
        }
        
        // Save data to JSON file as backup
        const backupFilePath = `./backup_${table}.json`;
        fs.writeFileSync(backupFilePath, JSON.stringify(sourceData.rows, null, 2));
        console.log(`Backup saved to ${backupFilePath}`);
        
        // Clear target table
        await executeQuery(targetPool, `TRUNCATE TABLE ${table} CASCADE`);
        console.log(`Cleared target table ${table}`);
        
        // Insert data into target
        let insertedCount = 0;
        for (const row of sourceData.rows) {
          const values = columns.map(col => row[col]);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          const insertQuery = `
            INSERT INTO ${table} (${columns.join(', ')}) 
            VALUES (${placeholders})
            ON CONFLICT DO NOTHING
          `;
          
          try {
            await executeQuery(targetPool, insertQuery, values);
            insertedCount++;
            
            // Progress indicator for large tables
            if (insertedCount % 100 === 0) {
              console.log(`Inserted ${insertedCount}/${sourceData.rows.length} rows in ${table}...`);
            }
          } catch (error) {
            console.error(`Error inserting row in ${table}:`, error.message);
            console.error('Row data:', JSON.stringify(row));
          }
        }
        
        console.log(`Completed migrating ${insertedCount}/${sourceData.rows.length} rows in ${table}`);
      } catch (error) {
        console.error(`Error migrating table ${table}:`, error.message);
      }
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    // Close connections
    sourcePool.end();
    targetPool.end();
  }
}

// Run the migration
migrateData().catch(error => {
  console.error('Unhandled error during migration:', error);
  process.exit(1);
});