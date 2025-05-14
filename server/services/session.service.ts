import session, { SessionOptions } from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '../db';

export class SessionService {
  private pgSession: any;
  private sessionOptions: SessionOptions;

  constructor() {
    const PgSession = connectPgSimple(session);
    this.pgSession = new PgSession({
      pool,
      tableName: 'sessions',
      // Use the same schema as the one specified in drizzle schema
      schemaName: 'public',
      // Clean up expired sessions (default is 24h)
      pruneSessionInterval: 60 * 15 // 15 minutes
    });

    // Replit is behind a proxy, so we need to trust it
    const isReplit = !!process.env.REPL_ID;
    const inDev = process.env.NODE_ENV === 'development';
    
    console.log('Session configuration:', {
      environment: process.env.NODE_ENV,
      isReplit,
      cookieSecure: isReplit || process.env.NODE_ENV === 'production'
    });
    
    // Use safer settings for the session store
    this.sessionOptions = {
      store: this.pgSession,
      secret: process.env.SESSION_SECRET || 'dutch-thrift-consignment-secret',
      resave: false,
      saveUninitialized: true, // Changed to true to ensure session ID is always assigned
      rolling: true, // Extend session lifetime on each request
      name: 'dutchthrift.sid', // Custom name to avoid conflicts
      proxy: isReplit, // Trust the proxy in Replit environment
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: false, // Set to false in development for simpler testing
        httpOnly: true,
        sameSite: 'lax',
        path: '/'
      }
    };
  }

  getSessionMiddleware() {
    return session(this.sessionOptions);
  }
}

export default SessionService;