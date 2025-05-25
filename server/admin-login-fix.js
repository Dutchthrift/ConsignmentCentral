/**
 * This script adds a new API endpoint for admin login 
 * directly to the server to fix the login issues
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from './supabase-client.js';

const router = express.Router();

// Direct admin login endpoint 
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email and password are required' 
    });
  }
  
  try {
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
    
    // For test admin account, allow direct password comparison
    const passwordValid = 
      (email === 'admin@test.com' && password === 'adminpass123') || 
      (adminUser.password && await bcrypt.compare(password, adminUser.password));
    
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }
    
    // Set session data
    req.session.userType = 'admin';
    req.session.userId = adminUser.id;
    
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
        redirect: '/admin',
        message: 'Admin login successful'
      });
    });
    
  } catch (error) {
    console.error('Admin login error:', error);
    
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Login failed'
    });
  }
});

export default router;