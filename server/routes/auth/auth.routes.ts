import express from 'express';
import AuthService from '../../services/auth.service';
import { isAuthenticated, attachUserData } from '../../middleware/auth.middleware';
import { z } from 'zod';
import { UserTypes, UserTypeValues } from '../../types';

const router = express.Router();
const authService = new AuthService();

// Login schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

// Registration schema
const registrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1), // Combined name field matching database
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional()
});

/**
 * Admin login route
 * POST /api/auth/admin/login
 */
router.post('/admin/login', async (req, res) => {
  try {
    // Validate request body
    const validInput = loginSchema.safeParse(req.body);
    if (!validInput.success) {
      return res.status(400).json({
        success: false,
        errors: validInput.error.format(),
        message: 'Invalid input data'
      });
    }

    const { email, password } = req.body;
    
    // Authenticate admin
    const adminUser = await authService.loginAdmin(email, password);
    
    // Set session data
    req.session.userId = adminUser.id;
    req.session.userType = 'admin';
    
    // Log session data for debugging
    console.log('Admin login - Session data:', {
      userId: req.session.userId,
      userType: req.session.userType,
      sessionID: req.sessionID
    });
    
    return res.status(200).json({
      success: true,
      data: {
        user: adminUser,
        token: '' // We're using session auth, so no token needed
      }
    });
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Login failed'
    });
  }
});

/**
 * Consignor login route
 * POST /api/auth/consignor/login
 */
router.post('/consignor/login', async (req, res) => {
  try {
    // Validate request body
    const validInput = loginSchema.safeParse(req.body);
    if (!validInput.success) {
      return res.status(400).json({
        success: false,
        errors: validInput.error.format(),
        message: 'Invalid input data'
      });
    }

    const { email, password } = req.body;
    
    // Authenticate consignor
    const consignor = await authService.loginConsignor(email, password);
    
    // Set session data
    req.session.customerId = consignor.id;
    req.session.userType = 'consignor';
    
    // Log session data for debugging
    console.log('Consignor login - Session data:', {
      customerId: req.session.customerId,
      userType: req.session.userType,
      sessionID: req.sessionID
    });
    
    return res.status(200).json({
      success: true,
      data: {
        user: consignor,
        customer: consignor,
        token: '' // We're using session auth, so no token needed
      }
    });
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Login failed'
    });
  }
});

/**
 * Register route - consignors only
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    // Validate request body
    const validInput = registrationSchema.safeParse(req.body);
    if (!validInput.success) {
      return res.status(400).json({
        success: false,
        errors: validInput.error.format(),
        message: 'Invalid input data'
      });
    }
    
    // Register new consignor
    const consignor = await authService.registerConsignor(req.body);
    
    // Set session data
    req.session.customerId = consignor.id;
    req.session.userType = 'consignor';
    
    return res.status(201).json({
      success: true,
      data: {
        user: consignor,
        customer: consignor,
        token: '' // We're using session auth, so no token needed
      }
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Registration failed'
    });
  }
});

/**
 * Logout route
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
    
    res.clearCookie('connect.sid');
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

/**
 * Get current user route
 * GET /api/auth/me
 */
router.get('/me', attachUserData, async (req, res) => {
  try {
    // Get user data from session
    const userData = await authService.getCurrentUser(
      req.session.userId, 
      req.session.customerId, 
      req.session.userType
    );
    
    if (!userData) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    return res.status(200).json(userData);
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Authentication failed'
    });
  }
});

/**
 * Redirect route for main path
 * GET /
 */
router.get('/', (req, res) => {
  // Check if user is logged in
  if (!req.session.userType) {
    // Not logged in, redirect to login page
    return res.redirect('/auth');
  }
  
  // Logged in, redirect based on user type
  if (req.session.userType === 'admin') {
    return res.redirect('/admin');
  } else {
    return res.redirect('/consignor/dashboard');
  }
});

export default router;