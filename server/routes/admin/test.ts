import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { db, executeRawQuery } from "../../db";
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
    
    // Verify token
    const decoded = authService.verifyToken(token);
    console.log('TEST Admin Auth token payload:', JSON.stringify(decoded, null, 2));
    
    if (!decoded || !decoded.id || decoded.role !== 'admin') {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    
    // Direct SQL query to verify admin
    try {
      const adminId = decoded.id;
      const query = `SELECT * FROM admin_users WHERE id = $1`;
      console.log(`TEST Auth - checking admin ID ${adminId}`);
      
      const result = await executeRawQuery(query, [adminId]);
      console.log('TEST Auth - SQL result:', result ? 'Found' : 'Not found', 'rows:', result?.length || 0);
      
      if (!result || result.length === 0) {
        return res.status(401).json({ success: false, message: "Admin not found" });
      }
      
      // Set the admin in the request
      req.user = {
        id: result[0].id,
        email: result[0].email,
        name: result[0].name,
        role: result[0].role
      };
      
      return next();
    } catch (sqlError) {
      console.error("TEST Auth - SQL error:", sqlError);
      return res.status(500).json({ success: false, message: "Database error" });
    }
  } catch (error) {
    console.error("TEST Auth - General error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
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