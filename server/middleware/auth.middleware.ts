import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { AuthService } from "../services/auth.service";

// Initialize auth service
const authService = new AuthService(storage);

// Define type for authenticated request to use in Express middleware
export interface AuthenticatedRequest extends Request {
  isAuthenticated(): boolean;
  user: any;
}

/**
 * Authentication configuration
 */
export function configureAuth(app: any): void {
  // Set up the authentication check middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Add isAuthenticated method to request
    (req as any).isAuthenticated = function() {
      return !!(req.session && req.session.userId && req.session.userType);
    };
    
    // If user is authenticated via session, add user data to request
    if (req.session && req.session.userId && req.session.userType) {
      const userId = req.session.userId;
      const userType = req.session.userType;
      
      // Load user data based on user type
      if (userType === "admin") {
        storage.getAdminUserById(userId)
          .then(admin => {
            if (admin) {
              (req as any).user = {
                ...admin,
                userType: "admin",
                isAdmin: true
              };
            }
            next();
          })
          .catch(() => next());
      } else if (userType === "consignor") {
        storage.getUserById(userId)
          .then(async user => {
            if (user) {
              const customer = await storage.getCustomerByUserId(userId);
              (req as any).user = {
                ...user,
                customer,
                userType: "consignor",
                isAdmin: false
              };
            }
            next();
          })
          .catch(() => next());
      } else {
        next();
      }
    } else {
      // Check for token-based authentication
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        
        try {
          // Verify token
          const decoded = authService.verifyToken(token);
          
          if (decoded) {
            // Attach user info to request
            (req as any).user = decoded;
            
            // Define isAuthenticated method
            (req as any).isAuthenticated = function() { 
              return true; 
            };
          }
        } catch (error) {
          console.error('Token auth failed:', error);
        }
      }
      
      next();
    }
  });
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req as AuthenticatedRequest).isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }
  next();
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!(req as AuthenticatedRequest).isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }
  
  const user = (req as AuthenticatedRequest).user;
  
  if (!user || user.userType !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required"
    });
  }
  
  next();
}

/**
 * Middleware to require consignor role
 */
export function requireConsignor(req: Request, res: Response, next: NextFunction) {
  if (!(req as AuthenticatedRequest).isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }
  
  const user = (req as AuthenticatedRequest).user;
  
  if (!user || user.userType !== "consignor") {
    return res.status(403).json({
      success: false,
      message: "Consignor access required"
    });
  }
  
  next();
}