import { DatabaseStorage } from './database-storage';
import { IStorage } from './storage-interface';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { pool } from './db-supabase';

const PostgresSessionStore = connectPg(session);

/**
 * Supabase Storage implementation for DutchThrift
 * Uses Postgres database for data storage and session management
 */
class SupabaseStorage extends DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    super();
    
    // Initialize the session store with our database connection pool
    this.sessionStore = new PostgresSessionStore({
      pool,
      tableName: 'sessions', // Uses the sessions table defined in our schema
      createTableIfMissing: true
    });

    console.log('✅ Initialized Supabase storage with PostgreSQL session store');
  }
}

// Export a singleton instance
export const storage = new SupabaseStorage();