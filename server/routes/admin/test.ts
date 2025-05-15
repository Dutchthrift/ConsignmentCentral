import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { db, executeRawQuery, pool } from "../../db";
import { adminUsers } from "@shared/schema";
import AuthService from "../../services/auth.service";

const router = Router();
const authService = new AuthService(storage);

// Simplified authentication middleware for testing
const adminAuth = async (req: Request, res: Response, next: Function) => {
  try {
    // Extract JWT token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
    
    console.log('TEST Admin Auth - token present:', !!token);
    
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }
    
    try {
      // Verify token
      const decoded = authService.verifyToken(token);
      console.log('TEST Admin Auth token payload:', JSON.stringify(decoded, null, 2));
      
      if (!decoded || !decoded.id || decoded.role !== 'admin') {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid token", 
          details: { hasId: !!decoded?.id, role: decoded?.role }
        });
      }
      
      // Direct SQL query to verify admin - WITHOUT using Drizzle
      try {
        const adminId = decoded.id;
        // Execute direct SQL query
        const client = await pool.connect();
        
        try {
          console.log(`TEST Auth - checking admin ID ${adminId} with direct pool.query`);
          const queryResult = await client.query('SELECT * FROM admin_users WHERE id = $1', [adminId]);
          
          console.log('TEST Auth - Direct pool query result:', {
            rowCount: queryResult.rowCount,
            fields: queryResult.fields.map(f => f.name)
          });
          
          if (queryResult.rowCount === 0) {
            return res.status(401).json({ success: false, message: "Admin not found" });
          }
          
          const adminUser = queryResult.rows[0];
          console.log('TEST Auth - Found admin:', {
            id: adminUser.id,
            email: adminUser.email,
            role: adminUser.role
          });
          
          // Set the admin in the request
          req.user = {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name,
            role: adminUser.role
          };
          
          return next();
        } finally {
          client.release();
        }
      } catch (sqlError) {
        console.error("TEST Auth - SQL error:", sqlError);
        return res.status(500).json({ 
          success: false, 
          message: "Database error", 
          error: sqlError.message
        });
      }
    } catch (jwtError) {
      console.error("TEST Auth - JWT error:", jwtError);
      return res.status(401).json({ 
        success: false, 
        message: "JWT verification error", 
        error: jwtError.message
      });
    }
  } catch (error) {
    console.error("TEST Auth - General error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message
    });
  }
};

// Simple test endpoint
router.get("/check", adminAuth, async (req: Request, res: Response) => {
  res.json({
    success: true, 
    message: "Admin authentication successful",
    user: req.user
  });
});

export default router;