/**
 * Unified database connection module
 * Provides a single robust connection to Supabase
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';
import { WebSocket } from 'ws';

dotenv.config();

// Verify the DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

console.log('Initializing unified database connection to Supabase');

// Enhanced connection string with more explicit parameters
let connectionString = process.env.DATABASE_URL;

// If the connection string doesn't include explicit parameters, try adding them
if (!connectionString.includes('connect_timeout=')) {
  connectionString += '?connect_timeout=15&application_name=dutchthrift_replit';
}

// Configure the connection pool with optimized settings for Replit and Supabase
export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for SSL connections to Supabase
  },
  max: 2, // Restrict to fewer connections to avoid overloading
  idleTimeoutMillis: 60000, // 1 minute idle timeout
  connectionTimeoutMillis: 15000, // 15 seconds connection timeout
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
  // Get a client from the pool
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

// Track connection status
let connectionStatus = false;

// Function to check if the database is responsive
export async function testConnection() {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT NOW()');
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

// Setup connection monitoring
// Run an initial test
testConnection().catch(console.error);

// Check the connection every 3 minutes
setInterval(() => {
  testConnection().catch(console.error);
}, 3 * 60 * 1000);

// Export status checking function
export function getDatabaseStatus() {
  return connectionStatus;
}