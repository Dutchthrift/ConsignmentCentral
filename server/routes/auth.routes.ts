import { Router, Request, Response, NextFunction } from 'express';
import type { Express } from 'express';
import passport from 'passport';
import { IStorage } from '../storage';
import AuthService from '../services/auth.service';

export function registerAuthRoutes(app: Express, storage: IStorage) {
  const authService = new AuthService(storage);
  
  // Initialize auth middleware
  app.use(authService.getAuthMiddleware());
  app.use(authService.getSessionMiddleware());
  
  // Create a router for auth routes
  const router = Router();
  
  // User info endpoint - get current logged in user
  router.get('/api/auth/user', (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }
    
    res.json({ 
      success: true, 
      data: req.user 
    });
  });
  
  // Login status endpoint
  router.get('/api/auth/status', (req: Request, res: Response) => {
    res.json({ 
      success: true, 
      authenticated: req.isAuthenticated(),
      user: req.isAuthenticated() ? req.user : null 
    });
  });
  
  // Logout endpoint
  router.post('/api/auth/logout', (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) { return next(err); }
      res.json({ success: true });
    });
  });
  
  // Google OAuth routes
  router.get('/api/auth/google', 
    passport.authenticate('google', { 
      scope: ['profile', 'email']
    })
  );
  
  router.get('/api/auth/google/callback', 
    passport.authenticate('google', { 
      failureRedirect: '/login?error=google-auth-failed'
    }),
    (req: Request, res: Response) => {
      // Successful authentication, redirect to dashboard
      res.redirect('/');
    }
  );
  
  // Apple OAuth routes
  router.get('/api/auth/apple', 
    passport.authenticate('apple')
  );
  
  router.post('/api/auth/apple/callback', 
    passport.authenticate('apple', { 
      failureRedirect: '/login?error=apple-auth-failed'
    }),
    (req: Request, res: Response) => {
      // Successful authentication, redirect to dashboard
      res.redirect('/');
    }
  );
  
  // Local authentication routes
  router.post('/api/auth/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists'
        });
      }
      
      // Hash password and create user
      const hashedPassword = await authService.hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        provider: 'local',
        role: 'consignor',
        externalId: null,
        profileImageUrl: null,
        customerId: null,
        // createdAt is added automatically by the database schema
      });
      
      // Log the user in
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        
        return res.status(201).json({
          success: true,
          data: user
        });
      });
    } catch (error) {
      next(error);
    }
  });
  
  router.post('/api/auth/login', (req: Request, res: Response, next: NextFunction) => {
    // Log the incoming request for debugging
    console.log('Login attempt:', { email: req.body.email });
    
    passport.authenticate('local', (err: Error | null, user: any, info: { message: string }) => {
      if (err) {
        console.error('Auth error:', err);
        return next(err);
      }
      
      if (!user) {
        console.log('Auth failed:', info?.message);
        return res.status(401).json({
          success: false,
          message: info?.message || 'Invalid credentials'
        });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return next(err);
        }
        
        // Update last login timestamp
        storage.updateUserLastLogin(user.id).catch(console.error);
        
        console.log('Login successful:', { userId: user.id, role: user.role });
        
        return res.json({
          success: true,
          data: user
        });
      });
    })(req, res, next);
  });
  
  // Admin check
  router.get('/api/auth/admin-check', (req: Request, res: Response) => {
    res.json({
      success: true,
      isAdmin: authService.isAdmin(req)
    });
  });
  
  // Mount the router to the app
  app.use(router);
  
  // Return auth service for other routes to use
  return authService;
}