import { DatabaseStorage } from './database-storage';
import connectPgSimple from 'connect-pg-simple';
import session from 'express-session';
import { pool } from './supabase-db';

class SupabaseDatabaseStorage extends DatabaseStorage {
  sessionStore: any; // Using any type to avoid SessionStore type issues

  constructor() {
    super(); // Initialize the parent DatabaseStorage with Supabase specifics
    
    // Create session store using connect-pg-simple
    const PostgresStore = connectPgSimple(session);
    
    this.sessionStore = new PostgresStore({
      pool,
      tableName: 'sessions',
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15 // Prune expired sessions every 15 minutes
    });
    
    console.log('Supabase database storage initialized with session store');
  }
}

// Export the Supabase-specific storage singleton
export const storage = new SupabaseDatabaseStorage();