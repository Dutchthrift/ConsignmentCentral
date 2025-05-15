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
        // If token is valid, find the admin user
        storage.getUserById(decoded.id).then(user => {
          if (user && user.role === 'admin') {
            // Set the user in the request
            req.user = user;
            return next();
          } else {
            return res.status(403).json({
              success: false,
              message: "Access denied. Admin role required.",
            });
          }
        }).catch(error => {
          console.error("Error verifying JWT admin user:", error);
          return res.status(500).json({
            success: false,
            message: "Authentication error"
          });
        });
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
        // If token is valid, find the user
        storage.getUserById(decoded.id).then(user => {
          if (user) {
            // Set the user in the request
            req.user = user;
            
            // For now just check if they're a consignor
            if (user.role !== 'consignor') {
              return res.status(403).json({
                success: false,
                message: "Access denied. Consignor role required.",
              });
            }
            
            return next();
          } else {
            return res.status(404).json({
              success: false,
              message: "User not found"
            });
          }
        }).catch(error => {
          console.error("Error verifying JWT consignor user:", error);
          return res.status(500).json({
            success: false,
            message: "Authentication error"
          });
        });
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