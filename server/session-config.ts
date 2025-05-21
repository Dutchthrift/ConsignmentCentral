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
      errorLog: (err) => console.error('Session store error:', err)
    }),
    secret: process.env.SESSION_SECRET || 'dutchthrift-session-secret',
    resave: true, // Changed to ensure session is saved on each request
    saveUninitialized: false,
    name: 'dutchthrift.sid', // Custom cookie name
    rolling: true, // Force cookie to be set on every response
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 30, // Extended to 30 days
      httpOnly: true,
      secure: false, // Set to false for development
      sameSite: 'lax' as const,
      path: '/'
    }
  };
  
  // Return the session middleware with proper options
  return session(sessionOptions);
}