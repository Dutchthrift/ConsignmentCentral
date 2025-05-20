import { Router, Request, Response } from 'express';
import { authService } from '../../services/auth.service';
import { z } from 'zod';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

// Get current user
router.get('/user', async (req: Request, res: Response) => {
  try {
    const user = await authService.loadUser(req);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin login
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = loginSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: validation.error.errors 
      });
    }
    
    const { email, password } = req.body;
    
    // Login admin
    const admin = await authService.loginAdmin(email, password);
    
    // Set session
    req.session.userId = admin.id;
    req.session.userType = 'admin';
    
    res.json({ success: true, user: admin });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(401).json({ success: false, message: errorMessage });
  }
});

// Consignor login
router.post('/consignor/login', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = loginSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: validation.error.errors 
      });
    }
    
    const { email, password } = req.body;
    
    // Login consignor
    const consignor = await authService.loginConsignor(email, password);
    
    // Set session
    req.session.userId = consignor.id;
    req.session.userType = 'consignor';
    
    res.json({ success: true, user: consignor });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(401).json({ success: false, message: errorMessage });
  }
});

// Consignor registration
router.post('/consignor/register', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = registerSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: validation.error.errors 
      });
    }
    
    const { email, password, firstName, lastName } = req.body;
    
    // Register consignor
    const consignor = await authService.registerConsignor(email, password, firstName, lastName);
    
    // Set session
    req.session.userId = consignor.id;
    req.session.userType = 'consignor';
    
    res.status(201).json({ success: true, user: consignor });
  } catch (error) {
    if (error instanceof Error && error.message === 'Email already in use') {
      return res.status(400).json({ success: false, message: error.message });
    }
    
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  // Destroy session
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

export default router;