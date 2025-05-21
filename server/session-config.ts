/**
 * Session configuration for the Dutch Thrift consignment platform
 */
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from '@neondatabase/serverless';

/**
 * Configure session middleware with PostgreSQL session store
 */
export function configureSession(pool: Pool) {
  const PgSession = connectPgSimple(session);
  
  // Configure session store
  const sessionStore = new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
  });
  
  // Session configuration
  const sessionOptions: session.SessionOptions = {
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'dutch-thrift-session-secret',
    resave: false,
    saveUninitialized: false,
    name: 'dutchthrift.sid',
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    }
  };
  
  return session(sessionOptions);
}