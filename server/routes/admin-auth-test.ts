import { Router, Request, Response } from "express";
import { pool } from "../db";
import jwt from "jsonwebtoken";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dutch-thrift-jwt-secret';

// Simple authentication test
router.post("/verify-token", async (req: Request, res: Response) => {
  try {
    // Extract token
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: "No token provided" 
      });
    }
    
    try {
      // Verify JWT
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('Token verification result:', decoded);
      
      // Check if admin user exists
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT * FROM admin_users WHERE id = $1', 
          [decoded.id]
        );
        
        if (result.rowCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Admin user not found in database",
            tokenData: decoded
          });
        }
        
        const admin = result.rows[0];
        const { password, ...safeAdminData } = admin;
        
        return res.status(200).json({
          success: true,
          message: "Token valid and admin found",
          admin: safeAdminData
        });
      } finally {
        client.release();
      }
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return res.status(401).json({
        success: false,
        message: "Invalid token",
        error: jwtError.message
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

export default router;