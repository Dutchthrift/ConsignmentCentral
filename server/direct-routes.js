/**
 * Direct routes to access admin and consignor dashboards
 */

import express from 'express';
import { supabase } from './supabase-client.js';

const router = express.Router();

// Direct admin login route
router.get('/admin-access', async (req, res) => {
  try {
    // Get admin user
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@test.com')
      .single();
    
    if (adminError || !adminUser) {
      return res.status(400).send('Admin user not found. Please ensure the admin user exists in the database.');
    }
    
    // Set session data
    req.session.userType = 'admin';
    req.session.userId = adminUser.id;
    
    // Save session and redirect
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err);
        return res.status(500).send('Error saving session');
      }
      
      // Redirect to admin dashboard
      res.redirect('/admin');
    });
  } catch (error) {
    console.error('Direct admin login error:', error);
    res.status(500).send('Server error');
  }
});

// Direct consignor login route
router.get('/consignor-access', async (req, res) => {
  try {
    // Get consignor user
    const { data: consignorUser, error: consignorError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', 'consignor@test.com')
      .single();
    
    if (consignorError || !consignorUser) {
      return res.status(400).send('Consignor user not found. Please ensure the consignor user exists in the database.');
    }
    
    // Set session data
    req.session.userType = 'consignor';
    req.session.customerId = consignorUser.id;
    
    // Save session and redirect
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err);
        return res.status(500).send('Error saving session');
      }
      
      // Redirect to consignor dashboard
      res.redirect('/consignor/dashboard');
    });
  } catch (error) {
    console.error('Direct consignor login error:', error);
    res.status(500).send('Server error');
  }
});

export default router;