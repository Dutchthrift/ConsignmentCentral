/**
 * Session configuration fix to ensure proper storage in Supabase PostgreSQL
 */
import { Pool } from '@neondatabase/serverless';
import connectPgSimple from 'connect-pg-simple';
import session from 'express-session';
import { db, pool } from './db';

/**
 * Configure session middleware that properly stores sessions in PostgreSQL
 */
export function configureSession() {
  const PgSession = connectPgSimple(session);
  
  // Create the session store with the database pool
  const sessionStore = new PgSession({
    pool: pool,
    tableName: 'session', // Use the standard session table name
    createTableIfMissing: true, // Auto-create the session table if needed
    errorLog: (err) => console.error('Session store error:', err)
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
  
  // Return the configured session middleware
  return session(sessionOptions);
}

/**
 * Ensure the session table exists
 */
export async function ensureSessionTable() {
  try {
    // Check if session table exists
    const exists = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'session'
      );
    `);
    
    // If table doesn't exist, create it
    if (!exists?.rows?.[0]?.exists) {
      console.log('Creating session table in PostgreSQL...');
      
      // Create the session table with the schema required by connect-pg-simple
      await db.execute(`
        CREATE TABLE IF NOT EXISTS "session" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL,
          CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
        );
        
        CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
      `);
      
      console.log('Session table created successfully');
    } else {
      console.log('Session table already exists in PostgreSQL');
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring session table exists:', error);
    return false;
  }
}