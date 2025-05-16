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

// Ultra-conservative pool configuration to absolutely minimize rate limit issues
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1, // Single connection pool to avoid rate limits entirely
  idleTimeoutMillis: 120000, // Keep connection alive for longer (2 minutes)
  connectionTimeoutMillis: 30000, // Longer timeout for slow connections
  maxUses: 500, // Reduce max uses further to maintain connection health
  allowExitOnIdle: false // Don't allow connections to exit on idle
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

// Temporary memory cache to reduce database hits
const memoryCache = new Map();

// Check if we need to make a real database connection or can use cached data
const shouldUseCache = (key: string): boolean => {
  if (!memoryCache.has(key)) return false;
  
  const { timestamp, data } = memoryCache.get(key);
  const now = Date.now();
  const cacheAge = now - timestamp;
  
  // Cache items for 5 minutes to drastically reduce database load
  return cacheAge < 5 * 60 * 1000;
};

// Store data in the memory cache
const cacheData = (key: string, data: any): void => {
  memoryCache.set(key, {
    timestamp: Date.now(),
    data
  });
};

// A minimal health check that doesn't touch the database if it's not needed
// We want to reduce database connections as much as possible under rate limiting
const keepAliveQuery = async () => {
  // Cache key for the health check
  const healthCheckKey = 'db_health_check';
  
  // If we have a recent health check result, use that instead of hitting the DB
  if (shouldUseCache(healthCheckKey)) {
    console.log('Database connection check: Using cached status (OK)');
    return;
  }
  
  try {
    // Only connect to DB if absolutely necessary (cache miss)
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('Database connection check: OK');
      // Reset retry count on successful connection
      connectionRetryCount = 0;
      
      // Cache the successful health check
      cacheData(healthCheckKey, true);
    } finally {
      client.release();
    }
  } catch (err: any) { // Adding type annotation to silence TypeScript error
    connectionRetryCount++;
    console.error(`Error during database connection check (attempt ${connectionRetryCount}):`, err);
    
    // Check if this is a rate limit error
    const isRateLimit = err.message && 
      (typeof err.message === 'string') && 
      (err.message.includes('rate limit') || 
       err.message.includes('too many connections') ||
       err.message.includes('exceeded'));
    
    // If we haven't exceeded max retries, schedule retry with exponential backoff
    if (connectionRetryCount <= MAX_RETRIES) {
      // Use much longer delays for rate limit errors
      const baseDelay = isRateLimit ? RETRY_DELAY_BASE * 5 : RETRY_DELAY_BASE;
      const jitter = Math.floor(Math.random() * JITTER_MAX); // Add random jitter
      const delay = baseDelay * Math.pow(2, connectionRetryCount - 1) + jitter;
      
      console.log(`Scheduling database reconnection attempt in ${delay}ms${isRateLimit ? ' (rate limited)' : ''}`);
      setTimeout(keepAliveQuery, delay);
    } else {
      console.error(`Failed to reconnect to database after ${MAX_RETRIES} attempts`);
      // Reset retry count to allow future scheduled attempts to work
      connectionRetryCount = 0;
      
      // Even on failure, cache a negative result to prevent hammering the database
      cacheData(healthCheckKey, false);
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