import { IStorage } from '../storage';
import { User, AdminUser, InsertUser, insertCustomerSchema, InsertCustomer } from '@shared/schema';
import { createHash, timingSafeEqual, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';

const scryptAsync = promisify(scrypt);

// Authentication service
export class AuthService {
  constructor(private storage: IStorage) {}

  /**
   * Hash a password for secure storage
   */
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
    return `${derivedKey.toString('hex')}.${salt}`;
  }

  /**
   * Compare a plain password with a hashed password
   */
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      const [hashedPart, salt] = hashedPassword.split('.');
      
      if (!hashedPart || !salt) {
        return false;
      }
      
      const hashedPasswordBuf = Buffer.from(hashedPart, 'hex');
      const suppliedPasswordBuf = await scryptAsync(plainPassword, salt, 64) as Buffer;
      
      return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Generate a JWT token for a user
   */
  generateToken(user: any, userType: 'admin' | 'consignor'): string {
    const payload = {
      id: user.id,
      email: user.email,
      userType,
      isAdmin: userType === 'admin'
    };
    
    return jwt.sign(
      payload,
      process.env.JWT_SECRET || 'dutch-thrift-secret-key',
      { expiresIn: '7d' }
    );
  }

  /**
   * Verify a JWT token
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'dutch-thrift-secret-key');
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Authenticate an admin user
   */
  async authenticateAdmin(email: string, password: string): Promise<{ admin: AdminUser, token: string } | null> {
    const admin = await this.storage.getAdminUserByEmail(email);
    
    if (!admin) {
      return null;
    }
    
    const isPasswordValid = await this.verifyPassword(password, admin.password);
    
    if (!isPasswordValid) {
      return null;
    }
    
    // Update last login time
    await this.storage.updateUserLastLogin(admin.id);
    
    // Generate JWT token
    const token = this.generateToken(admin, 'admin');
    
    return { admin, token };
  }

  /**
   * Authenticate a consignor user
   */
  async authenticateConsignor(email: string, password: string): Promise<{ user: User, customer: any, token: string } | null> {
    const user = await this.storage.getUserByEmail(email);
    
    if (!user) {
      return null;
    }
    
    const isPasswordValid = await this.verifyPassword(password, user.password || '');
    
    if (!isPasswordValid) {
      return null;
    }
    
    // Update last login time
    await this.storage.updateUserLastLogin(user.id);
    
    // Get customer information
    const customer = await this.storage.getCustomerByUserId(user.id);
    
    if (!customer) {
      return null;
    }
    
    // Generate JWT token
    const token = this.generateToken(user, 'consignor');
    
    return { user, customer, token };
  }

  /**
   * Register a new consignor user
   */
  async registerConsignor(userData: { 
    email: string; 
    password: string; 
    firstName: string; 
    lastName: string; 
    phone?: string; 
    address?: string; 
    city?: string; 
    state?: string; 
    postalCode?: string; 
    country?: string; 
  }): Promise<{ user: User, customer: any, token: string } | null> {
    try {
      // Check if user already exists
      const existingUser = await this.storage.getUserByEmail(userData.email);
      
      if (existingUser) {
        throw new Error('User with this email already exists');
      }
      
      // Hash the password
      const hashedPassword = await this.hashPassword(userData.password);
      
      // Create the user
      const newUser = await this.storage.createUser({
        email: userData.email,
        password: hashedPassword,
        name: `${userData.firstName} ${userData.lastName}`,
        role: 'consignor',
        provider: 'local'
      });
      
      // Create customer profile
      const customerData: InsertCustomer = {
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName, 
        user_id: newUser.id,
        phone: userData.phone || null,
        address: userData.address || null,
        city: userData.city || null,
        state: userData.state || null, 
        postal_code: userData.postalCode || null,
        country: userData.country || 'NL',
        company_name: null,
        vat_number: null
      };
      
      const customer = await this.storage.createCustomer(customerData);
      
      // Generate token
      const token = this.generateToken(newUser, 'consignor');
      
      return { user: newUser, customer, token };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }
}