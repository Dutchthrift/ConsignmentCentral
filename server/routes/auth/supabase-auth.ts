import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../supabase-client';
import { supabaseAuthService } from '../../services/supabase-auth.service';

const router = Router();

// Login form schema
const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  isAdmin: z.boolean().optional(),
});

// Registration form schema
const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["consignor"]).default("consignor"),
});

/**
 * GET /auth/login
 * Render login page
 */
router.get('/login', (req, res) => {
  // Check if user is already logged in
  if (req.session?.userType) {
    // Redirect to appropriate dashboard
    if (req.session.userType === 'admin') {
      return res.redirect('/admin');
    } else if (req.session.userType === 'consignor') {
      return res.redirect('/consignor/dashboard');
    }
  }

  res.render('login', { 
    error: null,
    message: req.query.message || null,
    mode: req.query.mode || null
  });
});

/**
 * POST /auth/login
 * Handle login form submission
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate input
    const { email, password, isAdmin } = loginSchema.parse(req.body);
    
    // Attempt to sign in with Supabase Auth
    const authData = await supabaseAuthService.signInWithEmail(email, password);
    
    if (!authData || !authData.user) {
      throw new Error('Authentication failed');
    }
    
    // Prioritize admin login if isAdmin flag is set
    if (isAdmin) {
      const { data: adminUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
      
      if (!adminUser) {
        throw new Error('Admin account not found');
      }
      
      // User exists in admin table
      await supabaseAuthService.setSession(req, {
        userType: 'admin',
        userId: adminUser.id,
        email: adminUser.email
      });
      
      return res.redirect('/admin');
    } else {
      // Check for consignor account first
      const { data: consignorUser } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
      
      if (consignorUser) {
        // User exists in consignor table
        await supabaseAuthService.setSession(req, {
          userType: 'consignor',
          customerId: consignorUser.id,
          email: consignorUser.email
        });
        
        return res.redirect('/consignor/dashboard');
      }
      
      // If no consignor account, check for admin account
      const { data: adminUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
      
      if (adminUser) {
        // User exists in admin table
        await supabaseAuthService.setSession(req, {
          userType: 'admin',
          userId: adminUser.id,
          email: adminUser.email
        });
        
        return res.redirect('/admin');
      }
      
      // User authenticated with Supabase but not found in our tables
      throw new Error('User account not found in system');
    }
    
  } catch (error) {
    console.error('Login error:', error);
    
    // Render login page with error
    return res.render('login', { 
      error: error instanceof Error ? error.message : 'Authentication failed',
      message: null,
      mode: req.body.isAdmin ? 'admin' : undefined
    });
  }
});

/**
 * GET /auth/register
 * Render registration page
 */
router.get('/register', (req, res) => {
  // Check if user is already logged in
  if (req.session?.userType) {
    // Redirect to appropriate dashboard
    if (req.session.userType === 'admin') {
      return res.redirect('/admin');
    } else if (req.session.userType === 'consignor') {
      return res.redirect('/consignor/dashboard');
    }
  }

  res.render('register', { error: null });
});

/**
 * POST /auth/register
 * Handle registration form submission
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate input
    const { email, password, name, role } = registerSchema.parse(req.body);
    
    // Check if user already exists in either table
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();
    
    if (existingAdmin) {
      return res.render('register', { 
        error: 'Email already registered as admin' 
      });
    }
    
    const { data: existingConsignor } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();
    
    if (existingConsignor) {
      return res.render('register', { 
        error: 'Email already registered as consignor' 
      });
    }
    
    // Sign up with Supabase Auth
    const authData = await supabaseAuthService.signUpWithEmail(email, password);
    
    if (!authData || !authData.user) {
      throw new Error('Registration failed');
    }
    
    // Create consignor record (we only allow consignor registration from the public site)
    const { data: newConsignor, error: consignorError } = await supabase
      .from('customers')
      .insert({
        email: email.toLowerCase(),
        name,
        role: 'consignor',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (consignorError || !newConsignor) {
      throw new Error(`Failed to create consignor record: ${consignorError?.message || 'Unknown error'}`);
    }
    
    // Set session data
    await supabaseAuthService.setSession(req, {
      userType: 'consignor',
      customerId: newConsignor.id,
      email: newConsignor.email
    });
    
    // Redirect to consignor dashboard
    return res.redirect('/consignor/dashboard');
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Render registration page with error
    return res.render('register', { 
      error: error instanceof Error ? error.message : 'Registration failed' 
    });
  }
});

/**
 * GET /auth/logout
 * Handle logout
 */
router.get('/logout', async (req: Request, res: Response) => {
  try {
    // Sign out from Supabase Auth
    await supabaseAuthService.signOut();
    
    // Clear session
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
      
      // Redirect to login page
      res.redirect('/auth/login?message=You have been logged out');
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.redirect('/auth/login?message=Error during logout');
  }
});

/**
 * GET /auth/github
 * Initiate GitHub OAuth login
 */
router.get('/github', async (req: Request, res: Response) => {
  try {
    const result = await supabaseAuthService.signInWithOAuth('github');
    
    // Redirect to the URL provided by Supabase
    if (result && result.url) {
      return res.redirect(result.url);
    }
    
    throw new Error('Failed to initiate GitHub login');
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return res.redirect('/auth/login?message=Error with GitHub login');
  }
});

/**
 * GET /auth/google
 * Initiate Google OAuth login
 */
router.get('/google', async (req: Request, res: Response) => {
  try {
    const result = await supabaseAuthService.signInWithOAuth('google');
    
    // Redirect to the URL provided by Supabase
    if (result && result.url) {
      return res.redirect(result.url);
    }
    
    throw new Error('Failed to initiate Google login');
  } catch (error) {
    console.error('Google OAuth error:', error);
    return res.redirect('/auth/login?message=Error with Google login');
  }
});

/**
 * GET /auth/callback
 * Handle OAuth callback
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    // Get the session from Supabase
    const session = await supabaseAuthService.getSession();
    
    if (!session) {
      throw new Error('No session found after OAuth login');
    }
    
    // Get user from session
    const user = session.user;
    
    if (!user || !user.email) {
      throw new Error('Invalid user data in session');
    }
    
    // Check if user exists in our system
    const { data: adminUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email.toLowerCase())
      .single();
    
    if (adminUser) {
      // User exists in admin table
      await supabaseAuthService.setSession(req, {
        userType: 'admin',
        userId: adminUser.id,
        email: adminUser.email
      });
      
      return res.redirect('/admin');
    }
    
    // Check consignor (customers) table
    const { data: consignorUser } = await supabase
      .from('customers')
      .select('*')
      .eq('email', user.email.toLowerCase())
      .single();
    
    if (consignorUser) {
      // User exists in consignor table
      await supabaseAuthService.setSession(req, {
        userType: 'consignor',
        customerId: consignorUser.id,
        email: consignorUser.email
      });
      
      return res.redirect('/consignor/dashboard');
    }
    
    // New user, create consignor account
    const { data: newConsignor, error: consignorError } = await supabase
      .from('customers')
      .insert({
        email: user.email.toLowerCase(),
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        role: 'consignor',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (consignorError || !newConsignor) {
      throw new Error(`Failed to create consignor record: ${consignorError?.message || 'Unknown error'}`);
    }
    
    // Set session data
    await supabaseAuthService.setSession(req, {
      userType: 'consignor',
      customerId: newConsignor.id,
      email: newConsignor.email
    });
    
    // Redirect to consignor dashboard
    return res.redirect('/consignor/dashboard');
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.redirect('/auth/login?message=Error processing login');
  }
});

export default router;