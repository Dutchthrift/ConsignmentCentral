import session from "express-session";
import { Pool } from "pg";
import connectPg from "connect-pg-simple";

// Create a PostgreSQL store for session data
const PostgresStore = connectPg(session);

export function configureSession(pool: Pool) {
  const sessionConfig: session.SessionOptions = {
    store: new PostgresStore({
      pool,
      tableName: "sessions",
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || "dutchthrift-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      // Secure should be true in production but can be false for development
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  return session(sessionConfig);
}

// Add type declarations to extend express-session
declare module "express-session" {
  interface SessionData {
    userId?: number;
    userType?: "admin" | "consignor";
  }
}