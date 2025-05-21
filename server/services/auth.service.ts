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
  if (!stored || !supplied) return false;
  
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = await scryptAsync(supplied, salt, 64) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Authentication service
 */
export default class AuthService {
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
      const passwordValid = await comparePasswords(password, adminUser.password || '');
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
        .select({
          id: customers.id,
          email: customers.email,
          password: customers.password,
          first_name: customers.first_name,
          last_name: customers.last_name,
          phone: customers.phone,
          address: customers.address,
          city: customers.city,
          state: customers.state,
          postal_code: customers.postal_code,
          country: customers.country,
          created_at: customers.created_at,
          updated_at: customers.updated_at
        })
        .from(customers)
        .where(eq(customers.email, email.toLowerCase()));

      if (!customer) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const passwordValid = await comparePasswords(password, customer.password || '');
      if (!passwordValid) {
        throw new Error('Invalid email or password');
      }

      // Return customer data (excluding password)
      const { password: _, ...customerData } = customer;
      return {
        ...customerData,
        name: `${customer.first_name} ${customer.last_name}`,
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

      // Format user data for Supabase schema
      const customerData = {
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone || null,
        address: userData.address || null,
        city: userData.city || null,
        state: userData.state || null,
        postal_code: userData.postalCode || null,
        country: userData.country || null,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Insert new customer
      const [newCustomer] = await db
        .insert(customers)
        .values(customerData)
        .returning();

      return {
        ...newCustomer,
        name: `${newCustomer.first_name} ${newCustomer.last_name}`,
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
            name: adminUser.name, // Use name field from Supabase
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
            name: `${consignor.first_name} ${consignor.last_name}`, // Use Supabase field names
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