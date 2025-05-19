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

console.log('Using direct Supabase pooler connection');

// Create a fresh connection pool with the same settings that worked in our test
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for SSL connections to Supabase
  },
  max: 1, // Using a single connection to avoid exceeding limits
  connectionTimeoutMillis: 10000, // 10 seconds connection timeout
  idleTimeoutMillis: 30000, // 30 seconds idle timeout
  allowExitOnIdle: true
});

// Add error handler to prevent app crashes on connection issues
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

// Do an immediate test query to verify connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection test failed:', err);
  } else {
    console.log('Database connection test successful:', res.rows[0]);
  }
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

// Export status checking function
export function getDatabaseStatus() {
  try {
    // Simple synchronous check
    return pool.totalCount > 0;
  } catch (error) {
    return false;
  }
}