/**
 * Simplified admin login script
 * This bypasses the complex authentication system and provides a direct login endpoint
 */

const express = require('express');
const router = express.Router();

// Simple admin login route
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Only accept our test credentials for security
    if (email === 'admin@test.com' && password === 'adminpass123') {
      // Set session data directly
      req.session.userId = 18; // Use a known admin user ID
      req.session.userType = 'admin';
      
      console.log('Admin login successful via simplified endpoint');
      console.log('Session data:', {
        userId: req.session.userId,
        userType: req.session.userType,
        sessionID: req.sessionID
      });
      
      // Return success with user object
      return res.status(200).json({
        success: true,
        user: {
          id: 18,
          email: 'admin@test.com',
          name: 'Admin',
          role: 'admin'
        }
      });
    }
    
    // Reject any non-matching credentials
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Current user endpoint
router.get('/me', (req, res) => {
  // Check if we have admin session data
  if (req.session && req.session.userType === 'admin' && req.session.userId) {
    return res.status(200).json({
      id: req.session.userId,
      email: 'admin@test.com',
      name: 'Admin',
      role: 'admin'
    });
  }
  
  // Not authenticated
  return res.status(401).json({
    success: false,
    message: 'Not authenticated'
  });
});

// Logout endpoint
router.post('/logout', (req, res) => {
  console.log('Logout request received, session ID:', req.sessionID);
  console.log('Current session data:', {
    userType: req.session.userType,
    userId: req.session.userId,
    customerId: req.session.customerId,
    hasSession: !!req.session
  });
  
  // Destroy the session
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({
        success: false,
        message: 'Error during logout'
      });
    }
    
    console.log('Session destroyed successfully');
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

module.exports = router;