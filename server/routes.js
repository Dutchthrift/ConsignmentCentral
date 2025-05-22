import express from 'express';
import configureSession from './middleware/session.middleware.js';
import supabaseAuthRoutes from './routes/auth/supabase-auth.routes.js';
import supabaseAdminRoutes from './routes/admin/supabase-admin.routes.js';
import supabaseConsignorRoutes from './routes/consignor/supabase-consignor.routes.js';
import { createServer } from 'http';

export function registerRoutes(app) {
  // Set up middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Configure session middleware
  configureSession(app);

  // Set up authentication routes
  app.use('/api/auth', supabaseAuthRoutes);
  
  // Set up admin routes
  app.use('/api/admin', supabaseAdminRoutes);
  
  // Set up consignor routes
  app.use('/api/consignor', supabaseConsignorRoutes);
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Dutch Thrift API is running' });
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}