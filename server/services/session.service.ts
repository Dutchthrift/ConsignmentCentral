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
      // Clean up expired sessions less frequently to reduce connections
      pruneSessionInterval: 60 * 60, // 60 minutes
      // Add additional options for connection stability
      createTableIfMissing: true,
      errorLog: (error) => console.error('PgSession connection error:', error),
      // Retry options
      conObject: {
        connectionTimeoutMillis: 10000,
        query_timeout: 10000,
        statement_timeout: 10000
      }
    });

    // Replit is behind a proxy, so we need to trust it
    const isReplit = !!process.env.REPL_ID;
    const inDev = process.env.NODE_ENV === 'development';
    
    console.log('Session configuration:', {
      environment: process.env.NODE_ENV,
      isReplit,
      cookieSecure: isReplit || process.env.NODE_ENV === 'production'
    });
    
    // Use safer settings for the session store with enhanced stability
    this.sessionOptions = {
      store: this.pgSession,
      secret: process.env.SESSION_SECRET || 'dutch-thrift-consignment-secret',
      resave: false,
      saveUninitialized: true, // Ensure session ID is always assigned
      rolling: true, // Extend session lifetime on each request
      name: 'dutchthrift.sid', // Custom name to avoid conflicts
      proxy: isReplit, // Trust the proxy in Replit environment
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days - shorter maxAge may be more stable
        secure: isReplit || process.env.NODE_ENV === 'production', // Should be true in production and Replit
        httpOnly: true,
        sameSite: 'none', // Allow cross-site usage for Replit previews
        path: '/'
      },
      // Add unhandled error handling for session store
      unset: 'destroy', // Remove session from store when req.session is destroyed
    };
    
    // Add error handler to the session store
    this.pgSession.on('error', (error: Error) => {
      console.error('Session store error:', error);
      // Continue operation despite errors
    });
  }

  getSessionMiddleware() {
    return session(this.sessionOptions);
  }
}

export default SessionService;