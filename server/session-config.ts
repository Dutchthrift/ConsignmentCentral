import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { pool } from './db';

// Set up PostgreSQL session store
const PgSessionStore = connectPg(session);

// Session configuration
export const sessionConfig = {
  store: new PgSessionStore({ 
    pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  name: 'dutchthrift.sid',
  secret: process.env.SESSION_SECRET || 'dutch-thrift-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const
  }
};

export default sessionConfig;