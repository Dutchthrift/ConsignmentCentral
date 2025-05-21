/**
 * Simple admin login route that bypasses any complex logic
 * and just works for the admin@test.com account
 */
import express from 'express';

const router = express.Router();

/**
 * Admin login route - extremely simplified for testing
 * POST /api/auth/simple-admin-login
 */
router.post('/simple-admin-login', (req, res) => {
  const { email, password } = req.body;
  
  // Only accept our test admin account
  if (email === 'admin@test.com' && password === 'adminpass123') {
    // Set session data
    req.session.userId = 1; // Assuming ID 1 for admin
    req.session.userType = 'admin';
    
    // Return simple response
    return res.json({
      success: true,
      user: {
        id: 1,
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin'
      }
    });
  }
  
  // Authentication failed
  return res.status(401).json({
    success: false,
    message: 'Invalid credentials'
  });
});

export default router;