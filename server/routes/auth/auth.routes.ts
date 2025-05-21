import express from 'express';
import AuthService, { hashPassword } from '../../services/auth.service';
import { isAuthenticated, attachUserData } from '../../middleware/auth.middleware';
import { z } from 'zod';
import { UserTypes } from '../../types';
import jwt from 'jsonwebtoken';

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
    req.session.userType = UserTypes.ADMIN;
    
    // Save session explicitly to ensure persistence
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
      } else {
        console.log('Session saved successfully');
      }
    });
    
    // Log session data for debugging
    console.log('Admin login - Session data:', {
      userId: req.session.userId,
      userType: req.session.userType,
      sessionID: req.sessionID,
      cookie: req.session.cookie
    });
    
    // Generate JWT token for alternative authentication method
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        id: adminUser.id,
        email: adminUser.email,
        role: 'admin',
        name: adminUser.name 
      },
      process.env.JWT_SECRET || 'dutch-thrift-jwt-secret',
      { expiresIn: '7d' }
    );
    
    console.log('Generated admin JWT token for authentication');
    
    return res.status(200).json({
      success: true,
      data: {
        user: adminUser,
        token: token // Include JWT token for alternative authentication
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
    req.session.userType = UserTypes.CONSIGNOR;
    
    // Save session explicitly to ensure persistence
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
      } else {
        console.log('Session saved successfully');
      }
    });
    
    // Log session data for debugging
    console.log('Consignor login - Session data:', {
      customerId: req.session.customerId,
      userType: req.session.userType,
      sessionID: req.sessionID,
      cookie: req.session.cookie
    });
    
    // Generate JWT token for alternative authentication method
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        id: consignor.id,
        email: consignor.email,
        role: 'consignor',
        name: consignor.name 
      },
      process.env.JWT_SECRET || 'dutch-thrift-jwt-secret',
      { expiresIn: '7d' }
    );
    
    console.log('Generated JWT token for authentication');
    
    return res.status(200).json({
      success: true,
      data: {
        user: consignor,
        customer: consignor,
        token: token // Include JWT token for alternative authentication
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
    req.session.userType = UserTypes.CONSIGNOR;
    
    // Explicitly save session
    req.session.save((err) => {
      if (err) {
        console.error('Session save error during registration:', err);
      } else {
        console.log('Registration - Session saved successfully with customerId:', consignor.id);
      }
    });
    
    // Log session data for debugging
    console.log('Registration - Session data:', {
      customerId: req.session.customerId,
      userType: req.session.userType,
      sessionID: req.sessionID,
      cookie: req.session.cookie
    });
    
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
 * Create test accounts route
 * GET /api/auth/create-test-accounts
 */
router.get('/create-test-accounts', async (req, res) => {
  try {
    // Check if this is coming from the same origin for security
    const referer = req.headers.referer || '';
    if (!referer.includes(req.headers.host || '')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Create admin account
    const adminEmail = 'admin@test.com';
    const adminPassword = await hashPassword('adminpass123');
    const adminName = 'Test Admin';
    
    // Create consignor account  
    const consignorEmail = 'consignor@test.com';
    const consignorPassword = await hashPassword('testpass123');
    const consignorName = 'Test Consignor';
    
    // Check if accounts already exist
    const existingAdmin = await authService.findAdminByEmail(adminEmail);
    const existingConsignor = await authService.findConsignorByEmail(consignorEmail);
    
    // Create admin if doesn't exist
    if (!existingAdmin) {
      await authService.createAdmin(adminEmail, adminPassword, adminName);
    }
    
    // Create consignor if doesn't exist
    if (!existingConsignor) {
      await authService.createConsignor({
        email: consignorEmail,
        password: consignorPassword,
        name: consignorName
      });
    }
    
    return res.json({
      success: true,
      message: 'Test accounts created successfully',
      testAccounts: {
        admin: {
          email: adminEmail,
          password: 'adminpass123'
        },
        consignor: {
          email: consignorEmail,
          password: 'testpass123'
        }
      }
    });
  } catch (error) {
    console.error('Error creating test accounts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create test accounts'
    });
  }
});

/**
 * Get current user route
 * GET /api/auth/me
 */
router.get('/me', async (req, res) => {
  // Log detailed session information for debugging
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
    // Check if session exists and has necessary data
    if (!req.session || (!req.session.userId && !req.session.customerId)) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    // Get user data from session
    const userData = await authService.getCurrentUser(
      req.session.userId, 
      req.session.customerId, 
      req.session.userType
    );
    
    if (!userData) {
      console.log('User data not found for session values:', {
        userId: req.session.userId,
        customerId: req.session.customerId,
        userType: req.session.userType
      });
      
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    console.log('Successfully retrieved user data:', {
      id: userData.id,
      role: userData.role,
      email: userData.email
    });
    
    return res.status(200).json(userData);
  } catch (error: any) {
    console.error('Error in /me endpoint:', error);
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
  if (req.session.userType === UserTypes.ADMIN) {
    return res.redirect('/admin');
  } else {
    return res.redirect('/consignor/dashboard');
  }
});

export default router;