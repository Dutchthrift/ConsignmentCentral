import { DatabaseStorage } from "./database-storage";
import { db } from "./supabase-db";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./supabase-db";

// Create the PostgreSQL session store for Supabase
const PostgresSessionStore = connectPgSimple(session);
const sessionStore = new PostgresSessionStore({
  pool,
  tableName: 'sessions',
  createTableIfMissing: true,
  schemaName: 'public',
  errorLog: (error) => console.error('Supabase session store error:', error),
});

// Extend the DatabaseStorage class with the session store
class SupabaseDatabaseStorage extends DatabaseStorage {
  sessionStore: any; // Using any type to avoid SessionStore type issues

  constructor() {
    super();
    this.sessionStore = sessionStore;
  }
}

// Create and export the storage instance
export const storage = new SupabaseDatabaseStorage();