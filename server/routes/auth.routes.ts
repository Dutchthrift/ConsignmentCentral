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
      res.redirect('/dashboard');
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
      res.redirect('/dashboard');
    }
  );
  
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