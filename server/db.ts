import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log('Using Supabase connection pooling for reliable database access');

// Configure the connection pool with appropriate settings for Supabase direct connection
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for SSL connections to Supabase
  },
  max: 2, // Very small pool size for Supabase direct connection limits
  idleTimeoutMillis: 60000, // 60 seconds idle timeout
  connectionTimeoutMillis: 30000, // 30 seconds connection timeout
  allowExitOnIdle: true
});

// Add error handler to prevent app crashes on connection issues
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

// Create a Drizzle client instance
export const db = drizzle(pool, { schema });

// Function to execute raw SQL queries directly
export async function executeRawQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

// Keep-alive function to keep the connection alive
let connectionStatus = false;

async function keepAliveQuery() {
  try {
    await executeRawQuery('SELECT 1');
    connectionStatus = true;
    console.log('Database connection check: OK');
  } catch (error) {
    connectionStatus = false;
    console.error('Database connection check: Failed', error);
  }
}

// Setup connection monitoring
// Set up the initial check and periodic checks
keepAliveQuery().catch(err => console.error('Initial database connection check failed:', err));

// Check the connection every 5 minutes
setInterval(() => {
  keepAliveQuery().catch(err => console.error('Periodic database connection check failed:', err));
}, 5 * 60 * 1000);

// Export status checking function
export function getDatabaseStatus() {
  return connectionStatus;
}