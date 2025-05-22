import express from 'express';
import { createServer } from 'http';
import session from 'express-session';
import { Pool } from '@neondatabase/serverless';
import { pool } from './db';
import { configureSession } from './session-config';
import authRoutes from './routes/auth/auth.routes';
import fixedAuthRoutes from './routes/auth/fixed-auth.routes';
import itemIntakeRoutes from './routes/item-intake.routes';
// We don't need a separate admin login file, we'll use the client-side solution
import { attachUserData } from './middleware/auth.middleware';
import { applyFixes } from './integration-fix';

export async function registerRoutes(app: express.Express) {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Configure session middleware
  app.use(configureSession(pool));

  // Add user data to requests where available
  app.use(attachUserData);
  
  // Apply our fixes for the Dutch Thrift authentication and item intake
  await applyFixes(app);
  
  // Register original auth routes (fixed routes will override where needed)
  app.use('/api/auth', authRoutes);
  
  // We're using client-side authentication for admin@test.com
  
  // Register consignor item intake routes
  app.use('/api/consignor/items', itemIntakeRoutes);
  
  // Redirect root to login page if not authenticated
  app.get('/', (req, res) => {
    // Debug session data
    console.log('Root route - Session data:', {
      hasSession: !!req.session,
      userType: req.session?.userType,
      userId: req.session?.userId,
      customerId: req.session?.customerId
    });
    
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

  return httpServer;
}