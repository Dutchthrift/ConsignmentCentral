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

// Enhanced pool configuration with even stricter limits to avoid rate limiting
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2, // Reduced to absolute minimum to prevent Neon rate limits
  idleTimeoutMillis: 60000, // Increased idle timeout to reduce reconnections
  connectionTimeoutMillis: 15000, // Increased connection timeout for slow connections
  maxUses: 1000, // Reduced max uses to maintain connection health
  allowExitOnIdle: true // Allow pool to exit on idle (helpful for serverless environments)
});

// Add error handler to prevent app crashes on connection issues
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  // The pool will emit an error event if a client encounters
  // an unrecoverable error. This is to prevent the app from crashing.
});

// Enhanced connection management with improved retry logic
let connectionRetryCount = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY_BASE = 5000; // Increased base delay to 5 seconds
const JITTER_MAX = 1000; // Add random jitter to prevent synchronized retries

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
    
    // Check if this is a rate limit error
    const isRateLimit = err.message && 
      (err.message.includes('rate limit') || 
       err.message.includes('too many connections') ||
       err.message.includes('exceeded'));
    
    // If we haven't exceeded max retries, schedule retry with exponential backoff
    if (connectionRetryCount <= MAX_RETRIES) {
      // Use longer delays for rate limit errors
      const baseDelay = isRateLimit ? RETRY_DELAY_BASE * 2 : RETRY_DELAY_BASE;
      const jitter = Math.floor(Math.random() * JITTER_MAX); // Add random jitter
      const delay = baseDelay * Math.pow(2, connectionRetryCount - 1) + jitter;
      
      console.log(`Scheduling database reconnection attempt in ${delay}ms${isRateLimit ? ' (rate limited)' : ''}`);
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

// Setup periodic ping every 5 minutes to prevent idle timeouts (reduced frequency)
const keepAliveInterval = setInterval(keepAliveQuery, 5 * 60 * 1000);

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