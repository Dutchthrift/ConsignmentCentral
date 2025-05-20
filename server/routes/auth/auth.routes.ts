import express, { Request, Response } from 'express';
import { storage } from '../../storage';
import { AuthService } from '../../services/auth.service';
import { z } from 'zod';

const router = express.Router();
const authService = new AuthService(storage);

// Login validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Registration validation schema
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

/**
 * Admin login route
 */
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    // Validate input
    const { email, password } = loginSchema.parse(req.body);
    
    // Authenticate admin
    const result = await authService.authenticateAdmin(email, password);
    
    if (!result) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Set session data
    req.session.userId = result.admin.id;
    req.session.userType = 'admin';
    
    // Return user data and token
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: result.admin.id,
          email: result.admin.email,
          name: result.admin.name,
          role: 'admin'
        },
        token: result.token
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }
    
    console.error('Admin login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Consignor login route
 */
router.post('/consignor/login', async (req: Request, res: Response) => {
  try {
    // Validate input
    const { email, password } = loginSchema.parse(req.body);
    
    // Authenticate consignor
    const result = await authService.authenticateConsignor(email, password);
    
    if (!result) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Set session data
    req.session.userId = result.user.id;
    req.session.userType = 'consignor';
    
    // Return user data and token
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: 'consignor'
        },
        customer: result.customer,
        token: result.token
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }
    
    console.error('Consignor login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Register new consignor route
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate input
    const userData = registerSchema.parse(req.body);
    
    // Register new consignor
    const result = await authService.registerConsignor(userData);
    
    if (!result) {
      return res.status(500).json({
        success: false,
        message: 'Failed to register user'
      });
    }

    // Set session data
    req.session.userId = result.user.id;
    req.session.userType = 'consignor';
    
    // Return user data and token
    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: 'consignor'
        },
        customer: result.customer,
        token: result.token
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }
    
    if (error.message === 'User with this email already exists') {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Logout route
 */
router.post('/logout', (req: Request, res: Response) => {
  // Clear session
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to logout'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

/**
 * Get current user data route
 */
router.get('/me', (req: Request, res: Response) => {
  if (!(req as any).isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
  
  const user = (req as any).user;
  
  res.status(200).json({
    success: true,
    data: {
      user
    }
  });
});

export default router;