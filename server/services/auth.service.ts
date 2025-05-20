import { Request, Response, NextFunction } from 'express';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { db } from '../db';
import { adminUsers, users, customers } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Extend Express Request to include user and authentication properties
export interface AuthenticatedRequest extends Request {
  user?: any;
  userType?: 'admin' | 'consignor';
  isAuthenticated(): boolean;
}

// Promisify the scrypt function for password hashing
const scryptAsync = promisify(scrypt);

export class AuthService {
  /**
   * Hash a password with a random salt
   */
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString('hex')}.${salt}`;
  }

  /**
   * Verify a password against a stored hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const [hashed, salt] = hash.split('.');
    const hashedBuf = Buffer.from(hashed, 'hex');
    const suppliedBuf = (await scryptAsync(password, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  }

  /**
   * Login admin with email and password
   */
  async loginAdmin(email: string, password: string): Promise<any> {
    try {
      // Find admin user by email
      const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
      
      if (!admin) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const passwordValid = await this.verifyPassword(password, admin.password);
      
      if (!passwordValid) {
        throw new Error('Invalid email or password');
      }

      // Update last login time
      await db
        .update(adminUsers)
        .set({ last_login: new Date() })
        .where(eq(adminUsers.id, admin.id));

      // Return admin user without password
      const { password: _, ...adminWithoutPassword } = admin;
      return adminWithoutPassword;
    } catch (error) {
      console.error('Admin login error:', error);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Login consignor with email and password
   */
  async loginConsignor(email: string, password: string): Promise<any> {
    try {
      // Find user by email
      const [user] = await db.select().from(users).where(eq(users.email, email));
      
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const passwordValid = await this.verifyPassword(password, user.password);
      
      if (!passwordValid) {
        throw new Error('Invalid email or password');
      }

      // Get associated customer record
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.user_id, user.id));

      // Update last login time
      await db
        .update(users)
        .set({ last_login: new Date() })
        .where(eq(users.id, user.id));

      // Return user and customer data without password
      const { password: _, ...userWithoutPassword } = user;
      return { ...userWithoutPassword, customer };
    } catch (error) {
      console.error('Consignor login error:', error);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Register a new consignor
   */
  async registerConsignor(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<any> {
    try {
      // Check if user already exists
      const existingUsers = await db.select().from(users).where(eq(users.email, email));
      
      if (existingUsers.length > 0) {
        throw new Error('Email already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          role: 'consignor',
          name: `${firstName} ${lastName}`,
          created_at: new Date(),
          provider: 'local'
        })
        .returning();

      // Create customer record
      const [customer] = await db
        .insert(customers)
        .values({
          email,
          first_name: firstName,
          last_name: lastName,
          user_id: newUser.id,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning();

      // Return user data without password
      const { password: _, ...userWithoutPassword } = newUser;
      return { ...userWithoutPassword, customer };
    } catch (error) {
      console.error('Consignor registration error:', error);
      throw new Error('Registration failed: ' + (error as Error).message);
    }
  }

  /**
   * Middleware to require authentication for protected routes
   */
  requireAuth() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      next();
    };
  }

  /**
   * Middleware to require admin role for admin routes
   */
  requireAdmin() {
    return [
      this.requireAuth(),
      (req: Request, res: Response, next: NextFunction) => {
        if (req.session?.userType !== 'admin') {
          return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        next();
      }
    ];
  }

  /**
   * Middleware to require consignor role for consignor routes
   */
  requireConsignor() {
    return [
      this.requireAuth(),
      (req: Request, res: Response, next: NextFunction) => {
        if (req.session?.userType !== 'consignor') {
          return res.status(403).json({ error: 'Forbidden: Consignor access required' });
        }
        next();
      }
    ];
  }

  /**
   * Load user based on session data
   */
  async loadUser(req: Request): Promise<any> {
    if (!req.session || !req.session.userId || !req.session.userType) {
      return null;
    }

    try {
      if (req.session.userType === 'admin') {
        const [admin] = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.id, req.session.userId));
        
        if (admin) {
          const { password: _, ...adminWithoutPassword } = admin;
          return adminWithoutPassword;
        }
      } else if (req.session.userType === 'consignor') {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, req.session.userId));
        
        if (user) {
          const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.user_id, user.id));
          
          const { password: _, ...userWithoutPassword } = user;
          return { ...userWithoutPassword, customer };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error loading user:', error);
      return null;
    }
  }
}

// Create and export a singleton instance
export const authService = new AuthService();