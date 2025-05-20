import { createClient, SupabaseClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Define interface for storage
interface IStorage {
  getUserByEmail: (email: string) => Promise<any>;
  createUser: (user: any) => Promise<any>;
}

export class SupabaseAuthService {
  private supabase: SupabaseClient;
  private storage: IStorage;
  private jwtSecret: string;
  
  constructor(storage: IStorage) {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials. Auth service may not function correctly.');
    }
    
    this.supabase = createClient(
      supabaseUrl || '',
      supabaseKey || ''
    );
    
    this.storage = storage;
    this.jwtSecret = process.env.JWT_SECRET || 'dutch-thrift-jwt-secret';
    
    console.log('Supabase Auth service initialized');
  }
  
  // Helper function to generate JWT token
  generateToken(userData: any): string {
    return jwt.sign(
      { 
        id: userData.id, 
        email: userData.email, 
        role: userData.role,
        name: userData.name,
        type: userData.type || 'user',
        isAdmin: userData.role === 'admin'
      },
      this.jwtSecret,
      { expiresIn: '7d' }
    );
  }
  
  // Login handler
  async login(email: string, password: string) {
    try {
      // First try Supabase authentication
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.log('Supabase login error:', error.message);
        // Fall back to internal authentication if Supabase auth fails
        return this.fallbackLogin(email, password);
      }
      
      // If Supabase auth succeeded, get user profile from our database
      const user = await this.storage.getUserByEmail(email);
      
      if (!user) {
        // Create user in our database if they don't exist yet
        const newUser = await this.storage.createUser({
          email,
          name: email.split('@')[0], // Simple name based on email
          role: 'user',
          provider: 'supabase',
          password: null // Password is managed by Supabase
        });
        
        const token = this.generateToken(newUser);
        return { success: true, user: newUser, token };
      }
      
      // Generate JWT token for frontend use
      const token = this.generateToken(user);
      return { success: true, user, token };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Authentication failed' };
    }
  }
  
  // Fallback login when Supabase auth fails
  async fallbackLogin(email: string, password: string) {
    try {
      // Check hardcoded admin credentials for development
      if (email === 'admin@dutchthrift.com' && password === 'admin123') {
        const adminUser = {
          id: 1,
          email: 'admin@dutchthrift.com',
          role: 'admin',
          name: 'Admin User',
          type: 'admin'
        };
        
        const token = this.generateToken(adminUser);
        return { success: true, user: adminUser, token };
      }
      
      // Check hardcoded consignor credentials for development
      if (email === 'theooenema@hotmail.com' && password === 'password123') {
        const consignorUser = {
          id: 2,
          email: 'theooenema@hotmail.com',
          role: 'consignor',
          name: 'Theo Oenema',
          type: 'consignor',
          customerId: 12
        };
        
        const token = this.generateToken(consignorUser);
        return { success: true, user: consignorUser, token };
      }
      
      // Check database for user
      try {
        const user = await this.storage.getUserByEmail(email);
        
        if (!user) {
          return { success: false, message: 'User not found' };
        }
        
        // For simplicity in development, skip password verification
        // In production, you would verify the password here
        
        const token = this.generateToken(user);
        return { success: true, user, token };
      } catch (dbError) {
        console.error('Database error during fallback login:', dbError);
        return { success: false, message: 'Database error during login' };
      }
    } catch (error) {
      console.error('Fallback login error:', error);
      return { success: false, message: 'Authentication failed' };
    }
  }
  
  // Register handler
  async register(email: string, password: string, name: string) {
    try {
      // First register with Supabase
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password
      });
      
      if (error) {
        console.error('Supabase registration error:', error.message);
        return { success: false, message: error.message };
      }
      
      // Then create user in our database
      const newUser = await this.storage.createUser({
        email,
        name: name || email.split('@')[0],
        role: 'consignor', // Default role for new users
        provider: 'supabase',
        password: null // Password is managed by Supabase
      });
      
      const token = this.generateToken(newUser);
      return { success: true, user: newUser, token };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed' };
    }
  }
  
  // Logout handler
  async logout(req: Request) {
    try {
      // Supabase logout
      const { error } = await this.supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase logout error:', error.message);
      }
      
      // Clear session if it exists
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error('Session destruction error:', err);
          }
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Logout failed' };
    }
  }
  
  // Authentication middleware
  authenticate(req: Request, res: Response, next: NextFunction) {
    // Check for token in header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        // Verify token
        const decoded = jwt.verify(token, this.jwtSecret) as any;
        
        // Attach user info to request
        req.user = decoded;
        
        // Define isAuthenticated function
        req.isAuthenticated = () => true;
        
        return next();
      } catch (error) {
        console.log('Token authentication failed:', error instanceof Error ? error.message : String(error));
      }
    }
    
    // If in development mode, allow auto-login for admin endpoints
    if (process.env.NODE_ENV !== 'production' && 
        (req.path.startsWith('/api/admin') || req.path.startsWith('/api/dashboard'))) {
      req.user = {
        id: 1,
        email: 'admin@dutchthrift.com',
        role: 'admin',
        isAdmin: true,
        name: 'Admin User'
      };
      
      // Define isAuthenticated function
      req.isAuthenticated = () => true;
      
      console.log('Applied development auth for endpoint:', req.path);
      return next();
    }
    
    // Continue without authentication for public endpoints
    next();
  }
  
  // Admin required middleware
  requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.user && (req.user as any).role === 'admin') {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.'
    });
  }
  
  // Get current user
  getCurrentUser(req: Request) {
    if (req.user) {
      return { success: true, user: req.user };
    }
    
    return { success: false, message: 'Not authenticated' };
  }
}