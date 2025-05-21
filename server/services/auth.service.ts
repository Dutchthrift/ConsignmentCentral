import { db } from '../db';
import { users, customers } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Password utilities
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = await scryptAsync(supplied, salt, 64) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Authentication service
 */
export class AuthService {
  /**
   * Login an admin user
   */
  async loginAdmin(email: string, password: string): Promise<any> {
    try {
      // Get user from database
      const [adminUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()));

      if (!adminUser) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const passwordValid = await comparePasswords(password, adminUser.password);
      if (!passwordValid) {
        throw new Error('Invalid email or password');
      }

      // Return user data (excluding password)
      const { password: _, ...userData } = adminUser;
      return {
        ...userData,
        role: 'admin'
      };
    } catch (error) {
      console.error('Admin login error:', error);
      throw error;
    }
  }

  /**
   * Login a consignor (customer)
   */
  async loginConsignor(email: string, password: string): Promise<any> {
    try {
      // Get customer from database
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.email, email.toLowerCase()));

      if (!customer) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const passwordValid = await comparePasswords(password, customer.password);
      if (!passwordValid) {
        throw new Error('Invalid email or password');
      }

      // Return customer data (excluding password)
      const { password: _, ...customerData } = customer;
      return {
        ...customerData,
        role: 'consignor'
      };
    } catch (error) {
      console.error('Consignor login error:', error);
      throw error;
    }
  }

  /**
   * Register a new consignor (customer)
   */
  async registerConsignor(userData: any): Promise<any> {
    try {
      // Check if email already exists
      const [existingUser] = await db
        .select()
        .from(customers)
        .where(eq(customers.email, userData.email.toLowerCase()));

      if (existingUser) {
        throw new Error('Email already registered');
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      // Format user data
      const customerData = {
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone || null,
        address: userData.address || null,
        city: userData.city || null,
        state: userData.state || null,
        postalCode: userData.postalCode || null,
        country: userData.country || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Insert new customer
      const [newCustomer] = await db
        .insert(customers)
        .values(customerData)
        .returning();

      // Return customer data (excluding password)
      const { password: _, ...newCustomerData } = newCustomer;
      return {
        ...newCustomerData,
        role: 'consignor'
      };
    } catch (error) {
      console.error('Consignor registration error:', error);
      throw error;
    }
  }

  /**
   * Get current user data
   */
  async getCurrentUser(userId: number | undefined, customerId: number | undefined, userType: string | undefined): Promise<any> {
    try {
      if (userType === 'admin' && userId) {
        // Get admin user data
        const [adminUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId));
        
        if (adminUser) {
          const { password: _, ...userData } = adminUser;
          return {
            ...userData,
            name: `${adminUser.firstName} ${adminUser.lastName}`,
            role: 'admin'
          };
        }
      } else if (userType === 'consignor' && customerId) {
        // Get consignor/customer data
        const [consignor] = await db
          .select()
          .from(customers)
          .where(eq(customers.id, customerId));
        
        if (consignor) {
          const { password: _, ...consignorData } = consignor;
          return {
            ...consignorData,
            name: `${consignor.firstName} ${consignor.lastName}`,
            role: 'consignor'
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }
}