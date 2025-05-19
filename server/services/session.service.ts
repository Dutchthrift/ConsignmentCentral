import session, { SessionOptions } from 'express-session';
import memoryStore from 'memorystore';
import 'dotenv/config';

// Create memory store for sessions instead of using PostgreSQL
const MemoryStore = memoryStore(session);

export class SessionService {
  private sessionStore: any;
  private sessionOptions: SessionOptions;

  constructor() {
    // Use in-memory session store to avoid database connection issues
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired sessions every 24h
    });
    
    console.log('Using in-memory session store for improved reliability');

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
      store: this.sessionStore,
      secret: process.env.SESSION_SECRET || 'dutch-thrift-consignment-secret',
      resave: false,
      saveUninitialized: true, // Ensure session ID is always assigned
      rolling: true, // Extend session lifetime on each request
      name: 'dutchthrift.sid', // Custom name to avoid conflicts
      proxy: isReplit, // Trust the proxy in Replit environment
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        secure: isReplit || process.env.NODE_ENV === 'production', // Should be true in production and Replit
        httpOnly: true,
        sameSite: 'none', // Allow cross-site usage for Replit previews
        path: '/'
      },
      // Add unhandled error handling for session store
      unset: 'destroy', // Remove session from store when req.session is destroyed
    };
  }

  getSessionMiddleware() {
    return session(this.sessionOptions);
  }
}

export default SessionService;