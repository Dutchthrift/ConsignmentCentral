/**
 * Direct database connection using Supabase
 * Optimized for Replit's environment
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Ensure we have a DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

console.log('Initializing direct database connection to Supabase');

// Configure a simplified connection with robust error handling
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for SSL connections to Supabase
  },
  // Reduce connection timeouts
  connectionTimeoutMillis: 5000, // 5 seconds connection timeout
  idleTimeoutMillis: 30000, // 30 seconds idle timeout
  max: 1, // Limit to a single connection
});

// Add comprehensive error handler
pool.on('error', (err) => {
  console.error('Database pool error (this is handled automatically):', err);
});

// Create a Drizzle client instance
export const db = drizzle(pool, { schema });

// Simple function to execute raw SQL queries
export async function executeRawQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows as T[];
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error executing raw query:', error);
    return [];
  }
}

// Verify database connection
let connectionStatus = false;

export async function testConnection() {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1 as test');
      connectionStatus = true;
      console.log('Database connection is healthy');
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

// Run the connection test immediately
testConnection().catch(console.error);

// Utility function to check database status
export function getDatabaseStatus() {
  return connectionStatus;
}