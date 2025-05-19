import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "../storage";
import AuthService from "../services/auth.service";

const authService = new AuthService(storage);

/**
 * Middleware to require admin access
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Debug session information
  console.log("Admin middleware session info:", {
    hasSession: !!req.session,
    sessionID: req.sessionID,
    isAuthenticated: req.isAuthenticated(),
    userPresent: !!req.user,
    userType: req.user?.role,
    cookies: req.headers.cookie
  });

  // First try JWT token authentication
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
  
  if (token) {
    const decoded = authService.verifyToken(token);
    if (decoded) {
      try {
        // Trust token during database connection issues - for demo/development
        // Check if this is an admin token
        if (decoded.isAdmin) {
          console.log('JWT token verification successful:', decoded);
          // During database connection issues, trust the JWT token directly
          // Set basic user info from token without database lookup
          req.user = {
            id: decoded.id,
            email: decoded.email,
            role: 'admin',
            name: decoded.name || 'Admin User',
            isAdmin: true
          };
          console.log('Admin authenticated via token:', { id: decoded.id, email: decoded.email });
          
          // Try to get the full user from database but don't block on it
          storage.getAdminUserById(decoded.id)
            .then(adminUser => {
              if (adminUser && adminUser.role === 'admin') {
                // Update user with complete database info
                req.user = adminUser;
              }
            })
            .catch(error => {
              console.error("Database lookup failed for admin, using token data:", error.message);
            });
            
          return next();
        } else {
          // Not an admin token
          return res.status(403).json({
            success: false,
            message: "Access denied. Admin role required."
          });
        }
      } catch (error) {
        console.error("Error verifying JWT admin:", error);
        return res.status(401).json({
          success: false,
          message: "Invalid token"
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });
    }
  } else {
    // Fallback to session-based authentication
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }
    
    next();
  }
}

/**
 * Middleware to require authentication and check if the requested resource belongs to the current consignor
 */
export function requireConsignorOwnership(req: Request, res: Response, next: NextFunction) {
  // First try JWT token authentication
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
  
  if (token) {
    const decoded = authService.verifyToken(token);
    if (decoded) {
      try {
        // First check if this is an admin token (admins should have access to consignor stuff)
        if (decoded.isAdmin) {
          storage.getAdminUserById(decoded.id).then(adminUser => {
            if (adminUser) {
              // Admin users can access consignor routes
              req.user = adminUser;
              console.log('Admin accessing consignor resources:', { id: adminUser.id, email: adminUser.email });
              return next();
            } else {
              return res.status(404).json({
                success: false,
                message: "Admin user not found"
              });
            }
          }).catch(error => {
            console.error("Error verifying JWT admin for consignor access:", error);
            return res.status(500).json({
              success: false,
              message: "Authentication error"
            });
          });
        } else {
          // Not an admin token, try regular user or customer
          // First check for consignor in users table
          storage.getUserById(decoded.id).then(user => {
            if (user && user.role === 'consignor') {
              // Regular user with consignor role
              req.user = user;
              console.log('Consignor authenticated via user token:', { id: user.id, email: user.email });
              return next();
            } else {
              // Now check for customer
              storage.getCustomer(decoded.id).then(customer => {
                if (customer && customer.role === 'consignor') {
                  // Set the user in the request
                  req.user = customer;
                  console.log('Consignor authenticated via customer token:', { id: customer.id, email: customer.email });
                  return next();
                } else {
                  return res.status(403).json({
                    success: false,
                    message: "Access denied. Consignor role required."
                  });
                }
              }).catch(error => {
                console.error("Error verifying JWT customer:", error);
                return res.status(500).json({
                  success: false,
                  message: "Authentication error"
                });
              });
            }
          }).catch(error => {
            console.error("Error verifying JWT user for consignor access:", error);
            return res.status(500).json({
              success: false,
              message: "Authentication error"
            });
          });
        }
      } catch (error) {
        console.error("Error verifying JWT consignor:", error);
        return res.status(401).json({
          success: false,
          message: "Invalid token"
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });
    }
  } else {
    // Fallback to session-based authentication
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }
    
    if (req.user.role !== 'consignor') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Consignor role required.",
      });
    }
    
    next();
  }
}