import { Pool } from '@neondatabase/serverless';
import connectPgSimple from 'connect-pg-simple';
import session from 'express-session';

/**
 * Configure session middleware
 */
export function configureSession(pool: Pool) {
  const PgSession = connectPgSimple(session);
  
  // Create session options
  const sessionOptions = {
    store: new PgSession({
      pool,
      tableName: 'session', // Session table name
      createTableIfMissing: true, // Create the session table if it doesn't exist
    }),
    secret: process.env.SESSION_SECRET || 'dutchthrift-session-secret',
    resave: true, // Changed to ensure session is saved on each request
    saveUninitialized: false,
    name: 'dutchthrift.sid', // Custom cookie name
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // Extended to 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/'
    }
  };
  
  // Return the session middleware with proper options
  return session(sessionOptions);
}