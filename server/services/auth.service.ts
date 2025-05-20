import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { adminUsers, customers, UserRole } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import session from 'express-session';

// Constants
const SALT_ROUNDS = 10;

// Types
export interface AuthenticatedRequest extends Request {
  user?: any;
  isAuthenticated: boolean;
  userType?: string;
}

export class AuthService {
  // Hash password
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  }

  // Verify password
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Admin login
  async loginAdmin(email: string, password: string): Promise<any> {
    try {
      // Find admin by email
      const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
      
      if (!admin) {
        throw new Error('Invalid email or password');
      }
      
      // Verify password
      const isValid = await this.verifyPassword(password, admin.password);
      
      if (!isValid) {
        throw new Error('Invalid email or password');
      }
      
      // Return admin without password
      const { password: _, ...adminWithoutPassword } = admin;
      return { ...adminWithoutPassword, userType: 'admin' };
    } catch (error) {
      console.error('Admin login error:', error);
      throw error;
    }
  }

  // Consignor login
  async loginConsignor(email: string, password: string): Promise<any> {
    try {
      // Find consignor by email
      const [consignor] = await db.select().from(customers).where(eq(customers.email, email));
      
      if (!consignor) {
        throw new Error('Invalid email or password');
      }
      
      // Check if password exists
      if (!consignor.password) {
        throw new Error('Account not set up properly. Please contact support.');
      }
      
      // Verify password
      const isValid = await this.verifyPassword(password, consignor.password);
      
      if (!isValid) {
        throw new Error('Invalid email or password');
      }
      
      // Return consignor without password
      const { password: _, ...consignorWithoutPassword } = consignor;
      return { ...consignorWithoutPassword, userType: 'consignor', role: UserRole.CONSIGNOR };
    } catch (error) {
      console.error('Consignor login error:', error);
      throw error;
    }
  }

  // Register new consignor
  async registerConsignor(email: string, password: string, firstName: string, lastName: string): Promise<any> {
    try {
      // Check if email already exists
      const [existingUser] = await db.select().from(customers).where(eq(customers.email, email));
      
      if (existingUser) {
        throw new Error('Email already in use');
      }
      
      // Hash password
      const hashedPassword = await this.hashPassword(password);
      
      // Create new consignor
      const [newConsignor] = await db.insert(customers).values({
        email,
        password: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        created_at: new Date(),
        updated_at: new Date()
      }).returning();
      
      // Return consignor without password
      const { password: _, ...consignorWithoutPassword } = newConsignor;
      return { ...consignorWithoutPassword, userType: 'consignor', role: UserRole.CONSIGNOR };
    } catch (error) {
      console.error('Consignor registration error:', error);
      throw error;
    }
  }

  // Middleware to require authentication
  requireAuth() {
    return (req: Request, res: Response, next: NextFunction) => {
      const authenticatedReq = req as AuthenticatedRequest;
      
      if (!req.session || !req.session.userId || !req.session.userType) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }
      
      authenticatedReq.isAuthenticated = true;
      authenticatedReq.userType = req.session.userType;
      
      next();
    };
  }

  // Middleware to require admin
  requireAdmin() {
    return [
      this.requireAuth(),
      (req: Request, res: Response, next: NextFunction) => {
        const authenticatedReq = req as AuthenticatedRequest;
        
        if (authenticatedReq.userType !== 'admin') {
          return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        
        next();
      }
    ];
  }

  // Middleware to require consignor
  requireConsignor() {
    return [
      this.requireAuth(),
      (req: Request, res: Response, next: NextFunction) => {
        const authenticatedReq = req as AuthenticatedRequest;
        
        if (authenticatedReq.userType !== 'consignor') {
          return res.status(403).json({ success: false, message: 'Consignor access required' });
        }
        
        next();
      }
    ];
  }

  // Load user info based on session
  async loadUser(req: Request): Promise<any> {
    try {
      const session = req.session;
      
      if (!session || !session.userId || !session.userType) {
        return null;
      }
      
      const userId = session.userId;
      const userType = session.userType;
      
      // Load admin
      if (userType === 'admin') {
        const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, userId));
        
        if (!admin) {
          return null;
        }
        
        const { password: _, ...adminWithoutPassword } = admin;
        return { ...adminWithoutPassword, userType: 'admin' };
      }
      
      // Load consignor
      if (userType === 'consignor') {
        const [consignor] = await db.select().from(customers).where(eq(customers.id, userId));
        
        if (!consignor) {
          return null;
        }
        
        const { password: _, ...consignorWithoutPassword } = consignor;
        return { ...consignorWithoutPassword, userType: 'consignor', role: UserRole.CONSIGNOR };
      }
      
      return null;
    } catch (error) {
      console.error('Load user error:', error);
      return null;
    }
  }
}

export const authService = new AuthService();