import { Router, Request, Response, NextFunction } from 'express';
import type { Express } from 'express';
import passport from 'passport';
import { IStorage } from '../storage';
import AuthService from '../services/auth.service';
import { UserType, UserRole } from '@shared/schema';

export function registerAuthRoutes(app: Express, storage: IStorage) {
  const authService = new AuthService(storage);
  
  // Initialize auth middleware
  app.use(authService.getAuthMiddleware());
  app.use(authService.getSessionMiddleware());
  
  // Create a router for auth routes
  const router = Router();
  
  // User info endpoint - get current logged in user (admin or customer)
  router.get('/api/auth/user', (req: Request, res: Response) => {
    // Log session details for debugging (only sensitive info is session ID)
    console.log('Session debug:', {
      hasSession: !!req.session,
      sessionID: req.sessionID, 
      isAuthenticated: req.isAuthenticated(),
      userPresent: !!req.user,
      userType: req.session?.userType,
      cookies: req.headers.cookie
    });
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }
    
    // Get the user data from the session
    const userData = req.user;
    
    // Log what we're returning
    console.log('Returning user data:', { 
      userId: (userData as any)?.id,
      userType: req.session?.userType
    });
    
    // Return the user object with userType added
    const userWithType = {
      ...userData as any,
      userType: req.session?.userType
    };
    
    // Return the user object directly without wrapping
    // This is what the frontend is expecting based on the client code
    res.json(userWithType);
  });
  
  // Login status endpoint
  router.get('/api/auth/status', (req: Request, res: Response) => {
    res.json({ 
      success: true, 
      authenticated: req.isAuthenticated(),
      user: req.isAuthenticated() ? req.user : null 
    });
  });
  
  // Logout endpoint - works for both admin and regular users
  router.post('/api/auth/logout', (req: Request, res: Response, next: NextFunction) => {
    // Save some info for logging before logout
    const userInfo = {
      userType: req.session?.userType,
      userId: req.user?.id,
      isAuthenticated: req.isAuthenticated()
    };
    
    req.logout((err) => {
      if (err) { return next(err); }
      
      // Clear user type from session
      if (req.session) {
        req.session.userType = undefined;
      }
      
      console.log('Logout successful:', userInfo);
      
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
  
  // Customer registration route (now creates a Customer model directly)
  router.post('/api/auth/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name, phone } = req.body;
      
      // Check if user or customer already exists
      const existingUser = await storage.getUserByEmail(email);
      const existingCustomer = await storage.getCustomerByEmail(email);
      
      if (existingUser || existingCustomer) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists'
        });
      }
      
      // Hash password and create customer
      const hashedPassword = await authService.hashPassword(password);
      const customer = await storage.createCustomer({
        email,
        password: hashedPassword,
        fullName: name, // Using fullName for Customer model
        phone: phone || null,
        payoutMethod: null,
        iban: null,
        address: null,
        city: null,
        country: null,
        role: UserRole.CONSIGNOR,
        // createdAt is added automatically by the database schema
      });
      
      // Log the customer in
      req.login(customer, (err) => {
        if (err) {
          return next(err);
        }
        
        // Set user type in session
        if (req.session) {
          req.session.userType = UserType.CUSTOMER;
        }
        
        console.log('Registration successful:', { 
          userId: customer.id, 
          role: customer.role, 
          name: customer.fullName,
          userType: UserType.CUSTOMER
        });
        
        // Generate token
        const token = authService.generateToken(customer);
        
        // Return customer directly with token
        return res.status(201).json({
          ...customer,
          token
        });
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Login endpoint for both customers and admin users
  router.post('/api/auth/login', (req: Request, res: Response, next: NextFunction) => {
    // Log the incoming request for debugging
    console.log('Login attempt:', { 
      email: req.body.email,
      hasSession: !!req.session,
      sessionID: req.sessionID
    });
    
    // Use local strategy which will check both customer and user tables
    passport.authenticate('local', (err: Error | null, account: any, info: { message: string }) => {
      if (err) {
        console.error('Auth error:', err);
        return next(err);
      }
      
      if (!account) {
        console.log('Auth failed:', info?.message);
        return res.status(401).json({
          success: false,
          message: info?.message || 'Invalid credentials'
        });
      }
      
      // Determine user type (customer or admin)
      const userType = 'role' in account && account.role === UserRole.ADMIN 
        ? UserType.ADMIN 
        : UserType.CUSTOMER;
      
      req.login(account, (err) => {
        if (err) {
          console.error('Login error:', err);
          return next(err);
        }
        
        // Set user type in session
        if (req.session) {
          req.session.userType = userType;
        }
        
        // Debug session after login
        console.log('After login session debug:', {
          hasSession: !!req.session,
          sessionID: req.sessionID,
          isAuthenticated: req.isAuthenticated(),
          userPresent: !!req.user,
          userType: req.session?.userType
        });
        
        // Update last login timestamp - use the appropriate method based on user type
        if (userType === UserType.ADMIN) {
          storage.updateAdminUserLastLogin(account.id).catch(console.error);
        } else {
          storage.updateCustomerByEmail(account.email, { lastLogin: new Date() }).catch(console.error);
        }
        
        console.log('Login successful:', { 
          userId: account.id, 
          role: account.role, 
          name: userType === UserType.CUSTOMER ? account.fullName : account.name,
          userType: userType
        });
        
        // Generate auth token
        try {
          const token = authService.generateToken(account);
          
          // Return account with token and userType
          return res.json({
            ...account,
            userType,
            token
          });
        } catch (tokenError) {
          console.error('Token generation error:', tokenError);
          // If token generation fails, still return the account with userType
          return res.json({
            ...account,
            userType
          });
        }
      });
    })(req, res, next);
  });
  
  // Admin login endpoint - now uses the unified auth strategy
  router.post('/api/auth/admin/login', (req: Request, res: Response, next: NextFunction) => {
    // Log the incoming request for debugging
    console.log('Admin login attempt via unified strategy:', { 
      email: req.body.email,
      hasSession: !!req.session,
      sessionID: req.sessionID
    });
    
    // Use the same unified strategy as regular login
    passport.authenticate('local', (err: Error | null, account: any, info: { message: string }) => {
      if (err) {
        console.error('Admin auth error:', err);
        return next(err);
      }
      
      if (!account) {
        console.log('Admin auth failed:', info?.message);
        return res.status(401).json({
          success: false,
          message: info?.message || 'Invalid admin credentials'
        });
      }
      
      // Check if the account is an admin
      if (!('role' in account) || account.role !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Admin privileges required'
        });
      }
      
      req.login(account, (err) => {
        if (err) {
          console.error('Admin login error:', err);
          return next(err);
        }
        
        // Set admin type in session
        if (req.session) {
          req.session.userType = UserType.ADMIN;
        }
        
        // Debug session after login
        console.log('After admin login session debug:', {
          hasSession: !!req.session,
          sessionID: req.sessionID,
          isAuthenticated: req.isAuthenticated(),
          userPresent: !!req.user,
          userType: req.session?.userType
        });
        
        // Update last login timestamp for admin
        storage.updateAdminUserLastLogin(account.id).catch(console.error);
        
        console.log('Admin login successful:', { 
          adminId: account.id, 
          role: account.role, 
          name: account.name,
          userType: UserType.ADMIN
        });
        
        // Generate admin token
        try {
          const token = authService.generateAdminToken(account);
          
          // Return admin user with token
          return res.json({
            ...account,
            userType: UserType.ADMIN,
            token: token
          });
        } catch (tokenError) {
          console.error('Admin token generation error:', tokenError);
          // If token generation fails, still return the admin user without token
          return res.json({
            ...account,
            userType: UserType.ADMIN
          });
        }
      });
    })(req, res, next);
  });
  
  // Admin registration endpoint - this should be secured in production
  router.post('/api/auth/admin/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name } = req.body;
      
      // Check if admin user already exists
      const existingAdmin = await storage.getAdminUserByEmail(email);
      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Admin user already exists'
        });
      }
      
      // Check if a customer with this email exists
      const existingCustomer = await storage.getCustomerByEmail(email);
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: 'Email is already used by a customer account'
        });
      }
      
      // Hash password and create admin user
      const hashedPassword = await authService.hashPassword(password);
      const adminUser = await storage.createAdminUser({
        email,
        password: hashedPassword,
        name,
        provider: 'local',
        role: UserRole.ADMIN,
        // Other properties will be handled by the storage implementation
      });
      
      // Log the admin in
      req.login(adminUser, (err) => {
        if (err) {
          return next(err);
        }
        
        // Set admin type in session
        if (req.session) {
          req.session.userType = UserType.ADMIN;
        }
        
        console.log('Admin registration successful:', { 
          adminId: adminUser.id, 
          role: adminUser.role, 
          name: adminUser.name,
          userType: UserType.ADMIN
        });
        
        // Generate admin token
        const token = authService.generateAdminToken(adminUser);
        
        // Return admin user directly with token and userType
        return res.status(201).json({
          ...adminUser,
          userType: UserType.ADMIN,
          token
        });
      });
    } catch (error) {
      console.error('Admin registration error:', error);
      next(error);
    }
  });

  // Admin check
  router.get('/api/auth/admin-check', (req: Request, res: Response) => {
    res.json({
      success: true,
      isAdmin: authService.isAdmin(req)
    });
  });
  
  // Test endpoint to check server health
  router.get('/api/auth/health', (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Auth system is healthy',
      timestamp: new Date().toISOString(),
      sessionExists: !!req.session,
      sessionID: req.sessionID,
      authenticated: req.isAuthenticated()
    });
  });
  
  // Mount the router to the app
  app.use(router);
  
  // Return auth service for other routes to use
  return authService;
}