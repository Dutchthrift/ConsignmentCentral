/**
 * Fixed admin login route that bypasses Passport for direct admin authentication
 */
import express from 'express';
import { z } from 'zod';
import { pool } from '../../db';

const router = express.Router();

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

/**
 * Admin login route
 * POST /api/auth/admin/login-direct
 */
router.post('/admin/login-direct', async (req, res) => {
  try {
    // Validate request body
    const validInput = loginSchema.safeParse(req.body);
    if (!validInput.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data'
      });
    }

    const { email, password } = req.body;
    
    // Find admin user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    const adminUser = result.rows[0];
    
    // For development, use hardcoded admin login
    if (email.toLowerCase() === 'admin@test.com' && password === 'adminpass123') {
      // Set session data
      req.session.userId = adminUser.id;
      req.session.userType = 'admin';
      
      // Log session data for debugging
      console.log('Admin login successful - Session data:', {
        userId: req.session.userId,
        userType: req.session.userType,
        sessionID: req.sessionID
      });
      
      // Save session before sending response
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            reject(err);
          } else {
            console.log('Session saved successfully');
            resolve();
          }
        });
      });
      
      // Return successful login with user details
      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name || 'Admin User',
            role: 'admin'
          }
        }
      });
    }
    
    // If we get here, the password was incorrect
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

export default router;