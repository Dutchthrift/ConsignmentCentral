import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

// Check for database URL
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required for database connection');
}

// Create a standardized connection pool for PostgreSQL (works with both Supabase and Neon)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL configuration that works with most PostgreSQL providers
  ssl: {
    rejectUnauthorized: false, // Allow self-signed certificates for development
  },
  // Connection pool configuration for better stability
  max: 5, // Limit concurrent connections
  idleTimeoutMillis: 60000, // 1 minute idle timeout
  connectionTimeoutMillis: 10000, // 10 second connection timeout
  allowExitOnIdle: true, // Clean up on app termination
});

// Log connection events for debugging
pool.on('connect', () => {
  console.log('Database connection established');
});

// Handle connection errors
pool.on('error', (err) => {
  console.error('Database connection error:', err.message);
  
  // Schedule reconnection with exponential backoff
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

// Initialize Drizzle ORM with the connection pool
export const db = drizzle(pool, { schema });

// Utility function for direct SQL queries
export async function executeRawQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

// Simple function to check database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error.message);
    return false;
  }
}