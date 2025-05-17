import { DatabaseStorage, IStorage } from './database-storage';
import connectPg from 'connect-pg-simple';
import session from 'express-session';
import { pool } from './db-supabase';

// Create PostgreSQL session store for Express sessions
const PostgresSessionStore = connectPg(session);

/**
 * Supabase-specific database storage implementation
 * This extends the base DatabaseStorage class with Supabase-specific customizations
 */
class SupabaseDatabaseStorage extends DatabaseStorage {
  sessionStore: session.Store;

  constructor() {
    // Initialize the base database storage with the pool
    super();
    
    // Initialize the session store with appropriate configuration
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: 'session',
      schemaName: 'public'
    });
    
    console.log('Supabase database storage initialized with session store');
  }
  
  // Override methods if needed for Supabase-specific functionality
}

// Export a singleton instance
export const storage: IStorage = new SupabaseDatabaseStorage();