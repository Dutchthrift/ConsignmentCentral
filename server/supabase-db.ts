import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

// Parse the DATABASE_URL to get the connection parameters
// This will be updated to use Supabase connection string
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required for database connection');
}

// Create a connection pool with proper SSL configuration for Supabase
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Less strict SSL validation for compatibility
  },
  // Connection pool configuration optimized for stability
  max: 5, // Fewer connections to avoid overwhelming the server
  idleTimeoutMillis: 60000, // Keep idle clients longer (1 minute) 
  connectionTimeoutMillis: 10000, // Longer timeout (10 seconds)
  allowExitOnIdle: true, // Allow pool to clean up on idle
});

// Logging for connection errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  
  // Schedule a reconnection attempt
  const reconnectDelay = Math.floor(Math.random() * 5000) + 5000; // 5-10 seconds
  console.log(`Scheduling database reconnection attempt in ${reconnectDelay}ms`);
  
  setTimeout(() => {
    console.log('Attempting to reconnect to database...');
    pool.connect()
      .then(client => {
        console.log('Successfully reconnected to database');
        client.release();
      })
      .catch(error => {
        console.error('Database reconnection attempt failed:', error.message);
      });
  }, reconnectDelay);
});

// Create and export the drizzle client
export const db = drizzle(pool, { schema });

// Utility function for executing raw SQL queries
export async function executeRawQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}