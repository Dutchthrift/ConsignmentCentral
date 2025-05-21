/**
 * Authentication middleware for the Dutch Thrift consignment platform
 */
import { Request, Response, NextFunction } from 'express';
import { UserTypes } from '../types';
import BcryptAuthService from '../services/bcrypt-auth.service';

const authService = new BcryptAuthService();

/**
 * Middleware to attach user data to the request object
 * This supports both the original auth implementation and our fixed auth system
 */
export async function attachUserData(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip for static assets or auth routes
    if (req.path.startsWith('/assets') || req.path.startsWith('/api/auth')) {
      return next();
    }
    
    // Log the session for debugging (without sensitive data)
    console.log('Session in middleware:', {
      hasSession: !!req.session,
      userType: req.session?.userType,
      userId: req.session?.userId,
      customerId: req.session?.customerId
    });
    
    // Attach user data if session exists
    if (req.session) {
      // Support both auth methods: Original (userId) and fixed (customerId)
      if (req.session.customerId) {
        // Retrieve consignor data using our fixed auth service
        const userData = await authService.getCurrentUser(
          undefined, 
          req.session.customerId, 
          UserTypes.CONSIGNOR
        );
        
        if (userData) {
          // Set user data on request for use in route handlers
          req.user = userData;
        }
      } else if (req.session.userId) {
        // Continue to support the original implementation (admin users)
        // This case is handled by Passport, so we don't need to do anything
      }
    }
    
    next();
  } catch (error) {
    console.error('Error in auth middleware:', error);
    next();
  }
}

/**
 * Middleware to require consignor authentication
 */
export function requireConsignorAuth(req: Request, res: Response, next: NextFunction) {
  // Check if user is authenticated and is a consignor
  if (!req.user || req.session?.userType !== UserTypes.CONSIGNOR) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  next();
}

/**
 * Middleware to require admin authentication
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  // Check if user is authenticated and is an admin
  if (!req.user || req.session?.userType !== UserTypes.ADMIN) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required'
    });
  }
  
  next();
}