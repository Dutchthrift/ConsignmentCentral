import { Pool } from '@neondatabase/serverless';
import connectPg from 'connect-pg-simple';
import session from 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userType?: "admin" | "consignor";
    customerId?: number;
  }
}

/**
 * Configure session handling with PostgreSQL session store
 */
export function configureSession(pool: Pool) {
  const PostgresStore = connectPg(session);
  
  return {
    store: new PostgresStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'dutch-thrift-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
  };
}