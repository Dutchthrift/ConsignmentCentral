import express from 'express';
import session from 'express-session';
import { Pool } from '@neondatabase/serverless';
import { pool } from './db';
import { configureSession } from './session-config';
import authRoutes from './routes/auth/auth.routes';
import { attachUserData } from './middleware/auth.middleware';

export function registerRoutes(app: express.Express) {
  // Configure session middleware
  app.use(session(configureSession(pool)));

  // Add user data to requests where available
  app.use(attachUserData);
  
  // Register auth routes
  app.use('/api/auth', authRoutes);
  
  // Redirect root to login page if not authenticated
  app.get('/', (req, res) => {
    if (!req.session.userType) {
      return res.redirect('/login');
    }
    
    // If authenticated, redirect based on user type
    if (req.session.userType === 'admin') {
      return res.redirect('/admin');
    } else {
      return res.redirect('/consignor/dashboard');
    }
  });

  return app;
}