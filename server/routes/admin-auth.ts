import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../supabase-client';
import * as bcrypt from 'bcryptjs';

const router = Router();

// Admin Login schema
const adminLoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/**
 * POST /admin/login
 * Handle admin login (bypassing Supabase Auth)
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate input
    const { email, password } = adminLoginSchema.parse(req.body);
    
    // Find admin user in database
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (adminError || !adminUser) {
      return res.status(401).json({
        success: false,
        message: 'Admin account not found'
      });
    }
    
    // Verify password (assuming password is stored with bcrypt)
    const passwordMatch = await bcrypt.compare(password, adminUser.password);
    
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }
    
    // Set session data
    req.session.userType = 'admin';
    req.session.userId = adminUser.id;
    req.session.email = adminUser.email;
    
    // Save session
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err);
        return res.status(500).json({
          success: false,
          message: 'Error saving session'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Admin login successful'
      });
    });
    
  } catch (error) {
    console.error('Admin login error:', error);
    
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Login failed'
    });
  }
});

export default router;