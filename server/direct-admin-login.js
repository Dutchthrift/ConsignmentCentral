/**
 * This script allows direct admin login without requiring complex authentication flows
 * Use it to create a simple direct login endpoint for admin users
 */

import express from 'express';
import * as bcrypt from 'bcryptjs';
import { supabase } from './supabase-client.js';

const router = express.Router();

// Add a direct admin login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }
    
    // Special case for test admin - simplifies login process
    if (email === 'admin@test.com' && password === 'adminpass123') {
      // Get the admin user record
      const { data: adminUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'admin@test.com')
        .single();
      
      if (adminUser) {
        // Set session directly
        req.session.userType = 'admin';
        req.session.userId = adminUser.id;
        
        req.session.save((err) => {
          if (err) {
            console.error('Error saving session:', err);
            return res.status(500).json({ success: false, message: 'Session error' });
          }
          
          return res.json({
            success: true,
            message: 'Admin login successful',
            redirect: '/admin'
          });
        });
        
        return;
      }
    }
    
    // Regular admin login with password check
    const { data: adminUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (!adminUser) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }
    
    // Check password
    const passwordValid = adminUser.password && 
      await bcrypt.compare(password, adminUser.password);
    
    if (!passwordValid) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }
    
    // Set session
    req.session.userType = 'admin';
    req.session.userId = adminUser.id;
    
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err);
        return res.status(500).json({ success: false, message: 'Session error' });
      }
      
      return res.json({
        success: true,
        message: 'Admin login successful',
        redirect: '/admin'
      });
    });
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;