import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '../db';
import { Express } from 'express';

export function configureSession(app: Express) {
  const pgSession = connectPgSimple(session);
  
  const sessionOptions: session.SessionOptions = {
    store: new pgSession({
      pool,
      tableName: 'sessions' // Uses the sessions table we created
    }),
    secret: process.env.SESSION_SECRET || 'dutchthrift_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  };
  
  // In production, ensure secure cookie when using HTTPS
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // Trust first proxy
  }
  
  // Use session middleware
  app.use(session(sessionOptions));
  
  return session;
}