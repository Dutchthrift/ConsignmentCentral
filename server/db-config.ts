/**
 * Centralized database configuration
 * This will be the single source of truth for database connection settings
 * All other files should import from this config
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';

dotenv.config();

// Use a direct connection string to ensure consistent behavior
const CONNECTION_STRING = 'postgresql://postgres.pkktakjpjytfxkkyuvrk:Prinsesseweg79!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

console.log('Initializing Supabase database connection');

// Configure the connection pool with appropriate settings
export const pool = new Pool({
  connectionString: CONNECTION_STRING,
  ssl: {
    rejectUnauthorized: false // Required for SSL connections to Supabase
  },
  max: 2, // Limit concurrent connections
  idleTimeoutMillis: 60000, // 1 minute idle timeout
  connectionTimeoutMillis: 10000, // 10 seconds connection timeout
});

// Add error handler
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

// Create a Drizzle client instance
export const db = drizzle(pool, { schema });

// Function to execute raw SQL queries
export async function executeRawQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

// Connection status tracking
let connectionStatus = false;

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW() as time');
      connectionStatus = true;
      console.log('Database connection verified:', result.rows[0]);
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    connectionStatus = false;
    console.error('Database connection test failed:', error);
    return false;
  }
}

// Run an initial test
testConnection().catch(console.error);

// Export status checking function
export function getDatabaseStatus(): boolean {
  return connectionStatus;
}