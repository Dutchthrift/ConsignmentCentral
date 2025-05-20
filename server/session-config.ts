import session from 'express-session';
import { Pool } from 'pg';
import connectPg from 'connect-pg-simple';

/**
 * Configure session handling with PostgreSQL session store
 */
export function configureSession(pool: Pool) {
  // Initialize PostgreSQL session store
  const PostgresStore = connectPg(session);
  
  // Extend session data with our custom properties
  declare module 'express-session' {
    interface SessionData {
      userId?: number;
      userType?: "admin" | "consignor";
    }
  }
  
  // Session configuration
  return {
    store: new PostgresStore({
      pool,
      tableName: 'sessions', // Table name for sessions
      createTableIfMissing: true // Create the table if it doesn't exist
    }),
    secret: process.env.SESSION_SECRET || 'dutch-thrift-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  };
}