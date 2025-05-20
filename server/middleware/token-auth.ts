import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Get JWT secret from environment or use fallback
const JWT_SECRET = process.env.JWT_SECRET || 'dutch-thrift-jwt-secret';

/**
 * Middleware to authenticate requests using JWT token
 * This provides a fallback authentication method when session handling fails
 */
export function tokenAuth(req: Request, res: Response, next: NextFunction) {
  // Get token from authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Attach user info to request
      req.user = decoded;
      
      // Define isAuthenticated function
      req.isAuthenticated = function() { return true; };
      
      console.log('Token auth successful for', req.path);
      return next();
    } catch (error) {
      console.log('Token auth failed:', error instanceof Error ? error.message : String(error));
    }
  }
  
  // For admin stats and other admin endpoints in development, use hardcoded auth
  if (process.env.NODE_ENV !== 'production' && 
      (req.path.startsWith('/api/admin') || req.path.startsWith('/api/dashboard'))) {
    req.user = {
      id: 1,
      email: 'admin@dutchthrift.com',
      role: 'admin',
      isAdmin: true,
      name: 'Admin User'
    };
    
    // Define isAuthenticated function
    req.isAuthenticated = function() { return true; };
    
    console.log('Applied development auth for admin endpoint:', req.path);
  }
  
  // Continue to next middleware in all cases
  next();
}