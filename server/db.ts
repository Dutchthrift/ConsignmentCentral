import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';
import ws from 'ws';

// Required for Neon serverless 
neonConfig.webSocketConstructor = ws;

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log('Setting up Neon database connection');

// Create a fresh connection pool for Neon
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
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

// Create a Drizzle client instance for Neon
export const db = drizzle(pool, { schema });

// Function to execute raw SQL queries directly
export async function executeRawQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  try {
    const result = await pool.query(query, params);
    return result.rows as T[];
  } catch (error) {
    console.error('Error executing raw query:', error);
    throw error;
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