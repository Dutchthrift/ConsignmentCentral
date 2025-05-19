// Direct connection test with basic configuration
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use direct Supabase connection string
const connectionString = process.env.DATABASE_URL;
console.log(`Using connection string: ${connectionString ? connectionString.replace(/:[^:]*@/, ':****@') : 'None found'}`);

// Create a client directly instead of a pool
const client = new pg.Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  // Reduced timeout to fail fast
  connectionTimeoutMillis: 5000
});

async function testConnection() {
  try {
    console.log('Attempting to connect directly...');
    await client.connect();
    console.log('Connection successful!');
    
    const result = await client.query('SELECT NOW() as time');
    console.log('Database query successful. Current time:', result.rows[0].time);
    
    await client.end();
    console.log('Connection closed successfully');
  } catch (error) {
    console.error('Connection error:', error.message);
    try {
      await client.end();
    } catch (e) {
      // Ignore errors on close
    }
  }
}

testConnection();