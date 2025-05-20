import express, { Request, Response } from 'express';
import { authService } from '../../services/auth.service';
import { z } from 'zod';

const router = express.Router();

// Define validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1)
});

// Get current authenticated user
router.get('/user', async (req: Request, res: Response) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await authService.loadUser(req);
    if (!user) {
      // Clear invalid session
      req.session.destroy(err => {
        if (err) console.error('Session destruction error:', err);
      });
      return res.status(401).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin login
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const admin = await authService.loginAdmin(email, password);
    
    // Set session data
    req.session.userId = admin.id;
    req.session.userType = 'admin';
    
    res.status(200).json(admin);
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    console.error('Admin login error:', error);
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

// Consignor login
router.post('/consignor/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const user = await authService.loginConsignor(email, password);
    
    // Set session data
    req.session.userId = user.id;
    req.session.userType = 'consignor';
    
    res.status(200).json(user);
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    console.error('Consignor login error:', error);
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

// Consignor registration
router.post('/consignor/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = registerSchema.parse(req.body);
    
    const user = await authService.registerConsignor(
      email,
      password,
      firstName,
      lastName
    );
    
    // Set session data for automatic login after registration
    req.session.userId = user.id;
    req.session.userType = 'consignor';
    
    res.status(201).json(user);
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    
    console.error('Registration error:', error);
    res.status(400).json({ 
      error: 'Registration failed', 
      message: (error as Error).message
    });
  }
});

// Logout for all user types
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    
    res.clearCookie('dutchthrift.sid');
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

export default router;