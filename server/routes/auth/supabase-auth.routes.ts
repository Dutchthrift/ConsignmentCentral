import { Express, Request, Response } from 'express';
import { SupabaseAuthService } from '../../services/supabase-auth.service';
import { storage } from '../../storage';
import { z } from 'zod';

// Define interface for storage
interface IStorage {
  getUserByEmail: (email: string) => Promise<any>;
  createUser: (user: any) => Promise<any>;
}

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).optional()
});

export function registerSupabaseAuthRoutes(app: Express, storage: IStorage) {
  const authService = new SupabaseAuthService(storage);

  // Apply authentication middleware to all routes
  app.use(authService.authenticate.bind(authService));
  
  // Login route
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const result = await authService.login(email, password);
      
      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: result.message || 'Authentication failed'
        });
      }
      
      return res.status(200).json({
        success: true,
        user: result.user,
        token: result.token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input',
          errors: error.errors
        });
      }
      
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  });
  
  // Register route
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { email, password, name } = registerSchema.parse(req.body);
      
      const result = await authService.register(email, password, name || '');
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message || 'Registration failed'
        });
      }
      
      return res.status(201).json({
        success: true,
        user: result.user,
        token: result.token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input',
          errors: error.errors
        });
      }
      
      console.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Registration failed'
      });
    }
  });
  
  // Logout route
  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    try {
      const result = await authService.logout(req);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.message || 'Logout failed'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  });
  
  // Get current user
  app.get('/api/auth/user', (req: Request, res: Response) => {
    const result = authService.getCurrentUser(req);
    
    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message || 'Not authenticated'
      });
    }
    
    return res.status(200).json(result.user);
  });
  
  // Admin check route
  app.get('/api/admin/check', authService.requireAdmin.bind(authService), (req: Request, res: Response) => {
    return res.status(200).json({
      success: true,
      message: 'Admin authenticated',
      user: req.user
    });
  });
  
  return authService;
}