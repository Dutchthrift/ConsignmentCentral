import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { IStorage } from '../storage';
import { AuthService } from '../services/auth.service';

export function registerAuthRoutes(router: Router, storage: IStorage) {
  const authService = new AuthService(storage);
  
  // Initialize auth middleware
  router.use(authService.getAuthMiddleware());
  router.use(authService.getSessionMiddleware());
  
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
  
  // Return auth service for other routes to use
  return authService;
}