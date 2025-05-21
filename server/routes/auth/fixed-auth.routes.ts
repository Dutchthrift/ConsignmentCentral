/**
 * Fixed authentication routes that use bcrypt for password hashing
 * and properly store sessions in PostgreSQL
 */
import express from 'express';
import BcryptAuthService, { hashPassword } from '../../services/bcrypt-auth.service';
import { z } from 'zod';
import { UserTypes } from '../../types';
import jwt from 'jsonwebtoken';

const router = express.Router();
const authService = new BcryptAuthService();

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
    
    // Authenticate consignor using bcrypt
    const consignor = await authService.loginConsignor(email, password);
    
    // Set session data
    req.session.customerId = consignor.id;
    req.session.userType = UserTypes.CONSIGNOR;
    
    // Save session explicitly to ensure persistence in PostgreSQL
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
    
    // Register new consignor using bcrypt for password hashing
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
 * Logout route
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  // Log the request for debugging
  console.log('Logout request received, session ID:', req.sessionID);
  console.log('Current session data:', {
    userType: req.session?.userType,
    userId: req.session?.userId,
    customerId: req.session?.customerId,
    hasSession: !!req.session
  });
  
  // Get the cookie name from the session
  const cookieName = req.app.get('trust proxy') 
    ? 'dutchthrift.sid' 
    : 'connect.sid';
  
  // Clear all cookies
  res.clearCookie(cookieName);
  res.clearCookie('dutchthrift.sid');
  res.clearCookie('connect.sid');
  
  // Clear session data first, then destroy
  if (req.session) {
    req.session.userId = undefined;
    req.session.customerId = undefined;
    req.session.userType = undefined;
  }
  
  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      console.error('Error during logout:', err);
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
    
    console.log('Session destroyed successfully');
    
    // Return success response with cache control headers
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

export default router;