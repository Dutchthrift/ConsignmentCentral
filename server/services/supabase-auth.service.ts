import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase-client';

/**
 * Service to handle Supabase authentication
 */
export class SupabaseAuthService {
  /**
   * Middleware to check if the user is authenticated
   */
  async requireAuth(req: Request, res: Response, next: NextFunction) {
    const session = req.session as any;
    
    if (!session?.userType) {
      return res.redirect('/login');
    }
    
    next();
  }
  
  /**
   * Middleware to require admin role
   */
  async requireAdmin(req: Request, res: Response, next: NextFunction) {
    const session = req.session as any;
    
    if (session?.userType !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    
    next();
  }
  
  /**
   * Middleware to require consignor role
   */
  async requireConsignor(req: Request, res: Response, next: NextFunction) {
    const session = req.session as any;
    
    if (session?.userType !== 'consignor') {
      return res.status(403).json({ 
        success: false, 
        message: 'Consignor access required' 
      });
    }
    
    next();
  }
  
  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Supabase auth error:', error);
      throw error;
    }
    
    return data;
  }
  
  /**
   * Sign in with OAuth provider
   */
  async signInWithOAuth(provider: 'github' | 'google') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: process.env.OAUTH_REDIRECT_URL || 'http://localhost:5000/auth/callback',
      }
    });
    
    if (error) {
      console.error('Supabase OAuth error:', error);
      throw error;
    }
    
    return data as unknown as { url: string };
  }
  
  /**
   * Sign up with email and password
   */
  async signUpWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      console.error('Supabase signup error:', error);
      throw error;
    }
    
    return data;
  }
  
  /**
   * Sign out
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Supabase signout error:', error);
      throw error;
    }
    
    return true;
  }
  
  /**
   * Get the current session
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Supabase session error:', error);
      throw error;
    }
    
    return data.session;
  }
  
  /**
   * Get the current user
   */
  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Supabase user error:', error);
      throw error;
    }
    
    return data.user;
  }
  
  /**
   * Set the session in Express
   */
  async setSession(req: Request, session: any) {
    if (session.userType) req.session.userType = session.userType;
    if (session.userId) req.session.userId = session.userId;
    if (session.customerId) req.session.customerId = session.customerId;
    
    // Store email in session data object
    if (session.email) {
      const sessionData = req.session as any;
      sessionData.email = session.email;
    }
    
    return new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }
}

export const supabaseAuthService = new SupabaseAuthService();