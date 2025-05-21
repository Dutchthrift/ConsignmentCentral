/**
 * Integration fix module to fix authentication and session handling
 * without changing the existing dashboard interface
 */
import express from 'express';
import { pool } from './db';
import { ensureSessionTable } from './session-fix';
import { configureSession } from './session-config';
import fixedAuthRoutes from './routes/auth/fixed-auth.routes';
import itemIntakeRoutes from './routes/item-intake.routes';

/**
 * Apply fixes to the Express application
 */
export async function applyFixes(app: express.Express) {
  console.log('Applying Dutch Thrift integration fixes...');
  
  try {
    // 1. Ensure the session table exists in PostgreSQL
    await ensureSessionTable();
    
    // 2. Apply the fixed authentication routes
    // These use bcrypt for password hashing and store users in the customers table
    app.use('/api/auth', fixedAuthRoutes);
    
    // 3. Apply the fixed item intake routes
    // These create orders properly and handle the item submission process
    app.use('/api/consignor/items', itemIntakeRoutes);
    
    console.log('Dutch Thrift integration fixes applied successfully');
    return true;
  } catch (error) {
    console.error('Error applying Dutch Thrift integration fixes:', error);
    return false;
  }
}

/**
 * Make global pool available for route handlers
 */
declare global {
  var pool: any;
}

global.pool = pool;