import { Pool } from 'pg';

// Hardcode the Supabase connection string for testing
const SUPABASE_DB_URL = "postgresql://postgres.pkktakjpjytfxkkyuvrk:Prinsesseweg79!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";

console.log(`Testing direct connection to Supabase: ${SUPABASE_DB_URL.replace(/:[^:]*@/, ':****@')}`);

// Create a simple connection pool with minimal settings
const pool = new Pool({
  connectionString: SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 10000
});

async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connection established, running test query...');
    const result = await client.query('SELECT NOW() as time');
    console.log('Connection successful!', result.rows[0]);
    
    // List all tables in the public schema
    console.log('Listing all tables in public schema:');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('No tables found in public schema');
    } else {
      console.log('Tables found:');
      tablesResult.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

// Run the test
testConnection()
  .then(success => {
    if (success) {
      console.log('Database connection test completed successfully');
      process.exit(0);
    } else {
      console.error('Database connection test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });