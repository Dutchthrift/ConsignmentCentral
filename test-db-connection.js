// Simple database connection test script
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Get the database URL from environment variables
const DATABASE_URL = process.env.DATABASE_URL;

console.log(`Testing database connection with the following URL:`);
console.log(`${DATABASE_URL ? DATABASE_URL.replace(/:[^:]*@/, ':****@') : 'No DATABASE_URL found in environment'}`);

// If there's no database URL, exit
if (!DATABASE_URL) {
  console.error('No DATABASE_URL found in environment variables. Please set it in the .env file.');
  process.exit(1);
}

// Create a connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Add longer timeouts for debugging
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 10000
});

async function testConnection() {
  console.log('Attempting to connect to the database...');
  let client;
  
  try {
    // Get a client from the pool
    client = await pool.connect();
    console.log('Successfully connected to the database!');
    
    // Execute a simple query
    const result = await client.query('SELECT NOW() as time');
    console.log('Database is responsive. Current time:', result.rows[0].time);
    
    // Release the client back to the pool
    client.release();
    
    // Close the pool
    await pool.end();
    
    console.log('Database connection test completed successfully!');
  } catch (error) {
    console.error('Database connection test failed:', error);
    
    if (client) {
      client.release();
    }
    
    try {
      await pool.end();
    } catch (e) {
      console.error('Error closing pool:', e);
    }
  }
}

// Run the test
testConnection();