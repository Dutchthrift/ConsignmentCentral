import express from 'express';
import session from 'express-session';
import { pool } from '../db';
import { configureSession } from '../session-config';

/**
 * Session service for handling express-session integration
 */
class SessionService {
  private sessionMiddleware: express.RequestHandler;

  constructor() {
    // Get session configuration from session-config
    const sessionConfig = configureSession(pool);
    
    // Create session middleware
    this.sessionMiddleware = session(sessionConfig);
  }

  /**
   * Get the session middleware
   */
  getSessionMiddleware(): express.RequestHandler {
    return this.sessionMiddleware;
  }
}

export default SessionService;