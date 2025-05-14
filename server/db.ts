import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSockets for Neon serverless
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced pool configuration for better stability
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // How long to wait to establish a connection
  maxUses: 7500, // Close connections after this many uses to prevent memory issues
});

// Add error handler to prevent app crashes on connection issues
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  // The pool will emit an error event if a client encounters
  // an unrecoverable error. This is to prevent the app from crashing.
});

// Ping database periodically to maintain connection
const keepAliveQuery = async () => {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('Database connection check: OK');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error during database connection check:', err);
  }
};

// Setup periodic ping every 5 minutes to prevent idle timeouts
setInterval(keepAliveQuery, 5 * 60 * 1000);

// Initialize connection
export const db = drizzle(pool, { schema });