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

    this.sessionOptions = {
      store: this.pgSession,
      secret: process.env.SESSION_SECRET || 'dutch-thrift-consignment-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'
      }
    };
  }

  getSessionMiddleware() {
    return session(this.sessionOptions);
  }
}

export default SessionService;