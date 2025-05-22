import express from 'express';
import authService from '../../services/supabase-auth.service.js';

const router = express.Router();

/**
 * POST /api/auth/admin/login
 * Admin login endpoint
 */
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }
    
    const admin = await authService.loginAdmin(email, password);
    
    // Set session data
    req.session.userId = admin.id;
    req.session.userType = 'admin';
    
    console.log(`Admin login successful: ${email} (userId: ${admin.id})`);
    
    return res.status(200).json({
      success: true,
      data: {
        user: admin
      }
    });
  } catch (error) {
    console.error('Admin login error:', error.message);
    return res.status(401).json({ 
      success: false, 
      message: error.message || 'Authentication failed' 
    });
  }
});

/**
 * POST /api/auth/consignor/login
 * Consignor login endpoint
 */
router.post('/consignor/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }
    
    const consignor = await authService.loginConsignor(email, password);
    
    // Set session data
    req.session.customerId = consignor.id;
    req.session.userType = 'consignor';
    
    console.log(`Consignor login successful: ${email} (customerId: ${consignor.id})`);
    
    return res.status(200).json({
      success: true,
      data: {
        user: consignor
      }
    });
  } catch (error) {
    console.error('Consignor login error:', error.message);
    return res.status(401).json({ 
      success: false, 
      message: error.message || 'Authentication failed' 
    });
  }
});

/**
 * POST /api/auth/consignor/register
 * Consignor registration endpoint
 */
router.post('/consignor/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password, and name are required' 
      });
    }
    
    const consignor = await authService.registerConsignor({
      email,
      password,
      name
    });
    
    // Set session data for automatic login
    req.session.customerId = consignor.id;
    req.session.userType = 'consignor';
    
    console.log(`Consignor registration successful: ${email} (customerId: ${consignor.id})`);
    
    return res.status(201).json({
      success: true,
      data: {
        user: consignor
      }
    });
  } catch (error) {
    console.error('Consignor registration error:', error.message);
    return res.status(400).json({ 
      success: false, 
      message: error.message || 'Registration failed' 
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout endpoint for both admin and consignor
 */
router.post('/logout', (req, res) => {
  // Clear session
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    
    console.log('User logged out successfully');
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  });
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', async (req, res) => {
  // Debug session info
  console.log('GET /api/auth/me - Session debug:', {
    hasSession: !!req.session,
    sessionID: req.sessionID,
    userId: req.session?.userId,
    customerId: req.session?.customerId,
    userType: req.session?.userType,
    cookie: req.session?.cookie,
    headers: {
      cookie: req.headers.cookie,
      authorization: req.headers.authorization
    }
  });
  
  try {
    // Check if user is authenticated
    if (!req.session || (!req.session.userId && !req.session.customerId)) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    let user = null;
    
    // Check user type
    if (req.session.userType === 'admin' && req.session.userId) {
      user = await authService.getAdminById(req.session.userId);
    } else if (req.session.userType === 'consignor' && req.session.customerId) {
      user = await authService.getConsignorById(req.session.customerId);
    }
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    return res.status(200).json(user);
  } catch (error) {
    console.error('Error getting current user:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/auth/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  return res.status(200).json({ 
    success: true, 
    message: 'Authentication service is running' 
  });
});

export default router;