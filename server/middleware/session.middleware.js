import session from 'express-session';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Configure express-session middleware
 */
export default function configureSession(app) {
  // Session configuration
  const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'dutchthrift-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      sameSite: 'lax'
    }
  };

  // Set secure cookie in production
  if (process.env.NODE_ENV === 'production') {
    sessionConfig.cookie.secure = true;
  }

  // Use session middleware
  app.use(session(sessionConfig));

  // Log session info in development
  app.use((req, res, next) => {
    // Include session debugging in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      const sessionInfo = {
        hasSession: !!req.session,
        userType: req.session?.userType,
        userId: req.session?.userId,
        customerId: req.session?.customerId
      };
      
      console.log('Session in middleware:', sessionInfo);
    }
    next();
  });
}