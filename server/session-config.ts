import { Pool } from '@neondatabase/serverless';
import connectPgSimple from 'connect-pg-simple';
import session from 'express-session';

/**
 * Configure session middleware
 */
export function configureSession(pool: Pool) {
  const PgSession = connectPgSimple(session);
  
  return {
    store: new PgSession({
      pool,
      tableName: 'session', // Session table name
      createTableIfMissing: true, // Create the session table if it doesn't exist
    }),
    secret: process.env.SESSION_SECRET || 'dutchthrift-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    }
  };
}