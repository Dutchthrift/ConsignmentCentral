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
  max: 10, // Reduced maximum connections in the pool to prevent overloading
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 8000, // Increased timeout to establish a connection
  maxUses: 5000, // Close connections after this many uses to prevent memory issues
  allowExitOnIdle: true // Allow pool to exit on idle (helpful for serverless environments)
});

// Add error handler to prevent app crashes on connection issues
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  // The pool will emit an error event if a client encounters
  // an unrecoverable error. This is to prevent the app from crashing.
});

// Enhanced connection management with retry logic
let connectionRetryCount = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY_BASE = 2000; // Base delay of 2 seconds

// Ping database periodically to maintain connection
const keepAliveQuery = async () => {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('Database connection check: OK');
      // Reset retry count on successful connection
      connectionRetryCount = 0;
    } finally {
      client.release();
    }
  } catch (err) {
    connectionRetryCount++;
    console.error(`Error during database connection check (attempt ${connectionRetryCount}):`, err);
    
    // If we haven't exceeded max retries, schedule an immediate retry with exponential backoff
    if (connectionRetryCount <= MAX_RETRIES) {
      const delay = RETRY_DELAY_BASE * Math.pow(2, connectionRetryCount - 1);
      console.log(`Scheduling database reconnection attempt in ${delay}ms`);
      setTimeout(keepAliveQuery, delay);
    } else {
      console.error(`Failed to reconnect to database after ${MAX_RETRIES} attempts`);
      // Reset retry count to allow future scheduled attempts to work
      connectionRetryCount = 0;
    }
  }
};

// Initial database connection check
keepAliveQuery();

// Setup periodic ping every 3 minutes to prevent idle timeouts
const keepAliveInterval = setInterval(keepAliveQuery, 3 * 60 * 1000);

// Properly handle interval cleanup when process exits
process.on('SIGTERM', () => {
  clearInterval(keepAliveInterval);
  pool.end();
});

process.on('SIGINT', () => {
  clearInterval(keepAliveInterval);
  pool.end();
});

// Initialize connection
export const db = drizzle(pool, { schema });