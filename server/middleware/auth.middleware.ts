import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users, customers } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Extended request interface with authentication properties
export interface AuthenticatedRequest extends Request {
  user?: any;
  isAdmin: () => boolean;
  isConsignor: () => boolean;
}

/**
 * Check if the user is authenticated
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  
  // Check if user is authenticated via session
  if (!req.session.userType || (!req.session.userId && !req.session.customerId)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  // Add helper methods to the request object
  authReq.isAdmin = () => req.session.userType && req.session.userType === 'admin';
  authReq.isConsignor = () => req.session.userType && req.session.userType === 'consignor';
  
  // Continue to the next middleware
  next();
}

/**
 * Require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  
  // First check if authenticated
  isAuthenticated(req, res, () => {
    // Then check if admin
    if (req.session.userType !== 'admin' || !req.session.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }
    
    // Continue to the next middleware
    next();
  });
}

/**
 * Require consignor role
 */
export function requireConsignor(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  
  // First check if authenticated
  isAuthenticated(req, res, () => {
    // Then check if consignor
    if (req.session.userType !== 'consignor' || !req.session.customerId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Consignor access required' });
    }
    
    // Continue to the next middleware
    next();
  });
}

/**
 * Attach the user data to the request object
 */
export async function attachUserData(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  
  try {
    // Attach user data based on user type
    if (req.session.userType === 'admin' && req.session.userId) {
      // Get admin user data
      const [adminUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.session.userId));
      
      if (adminUser) {
        authReq.user = {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,  // Supabase stores full name in name field
          role: 'admin'
        };
      }
    } else if (req.session.userType === 'consignor' && req.session.customerId) {
      // Get consignor/customer data
      const [consignor] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, req.session.customerId));
      
      if (consignor) {
        authReq.user = {
          id: consignor.id,
          email: consignor.email,
          name: `${consignor.first_name} ${consignor.last_name}`,  // Use Supabase field names
          role: 'consignor',
          customer: consignor
        };
      }
    }
    
    next();
  } catch (error) {
    console.error('Error attaching user data:', error);
    next();
  }
}