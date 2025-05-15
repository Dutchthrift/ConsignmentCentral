import { Request, Response, NextFunction } from 'express';
import { UserType, UserRole } from '@shared/schema';

// Custom type to augment Express.Request
declare global {
  namespace Express {
    interface Request {
      userType?: string;
    }
  }
}

/**
 * Middleware to require admin access
 * This checks if the user is authenticated and has admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  console.log('Admin check:', {
    isAuthenticated: req.isAuthenticated(),
    userType: req.session?.userType,
    role: req.user?.role
  });

  if (!req.isAuthenticated() || 
      req.session?.userType !== UserType.ADMIN || 
      req.user?.role !== UserRole.ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  
  next();
}

/**
 * Middleware to require consignor access
 * This checks if the user is authenticated and has consignor role
 */
export function requireConsignor(req: Request, res: Response, next: NextFunction) {
  console.log('Consignor check:', {
    isAuthenticated: req.isAuthenticated(),
    userType: req.session?.userType,
    role: req.user?.role
  });
  
  if (!req.isAuthenticated() || 
      req.session?.userType !== UserType.CUSTOMER || 
      req.user?.role !== UserRole.CONSIGNOR) {
    return res.status(403).json({
      success: false,
      message: 'Consignor access required'
    });
  }
  
  next();
}

/**
 * Middleware to require consignor access to specific resources
 * Ensures a consignor can only access their own data
 */
export function requireConsignorOwnership(req: Request, res: Response, next: NextFunction) {
  // First check if the user is a consignor
  if (!req.isAuthenticated() || 
      req.session?.userType !== UserType.CUSTOMER || 
      req.user?.role !== UserRole.CONSIGNOR) {
    return res.status(403).json({
      success: false,
      message: 'Consignor access required'
    });
  }
  
  // Get the requested resource ID - this can be from params or query
  const requestedId = req.params.id || req.query.id;
  
  // For API endpoints that don't have an ID parameter
  if (!requestedId) {
    return next();
  }
  
  // Check if the user is accessing their own customer data
  if (req.user && 'customerId' in req.user) {
    const userCustomerId = (req.user as any).customerId;
    
    // Check if the user has a customerId and if it matches the requested ID
    // Or if the user is an admin (admins can access any customer data)
    if (
      (userCustomerId && userCustomerId.toString() === requestedId.toString()) ||
      req.user.role === UserRole.ADMIN
    ) {
      return next();
    }
  }
  
  // If we get here, the user is trying to access another customer's data
  return res.status(403).json({
    success: false,
    message: 'You do not have permission to access this resource'
  });
}