import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import 'dotenv/config';

// Validate that we have a database URL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to set up the Supabase database?"
  );
}

// Create a connection pool with conservative settings
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5, // Increased slightly for Supabase which handles more connections
  idleTimeoutMillis: 30000, 
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false } // Required for Supabase connections
});

// Add error handler to prevent app crashes on connection issues
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

// Initialize Drizzle ORM
export const db = drizzle(pool, { schema });

// Add a direct SQL query function for cases where ORM causes issues
export async function executeRawQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows as T[];
  } catch (error) {
    console.error('Error executing raw query:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Health check function to verify database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('Database connection check: OK');
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database connection check failed:', err);
    return false;
  }
}

// Run an initial health check
checkDatabaseConnection().catch(console.error);