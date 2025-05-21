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
  
  // Check if password uses our format with salt
  if (!stored.includes('.')) {
    console.log('Password format incorrect - does not contain salt separator');
    return false;
  }
  
  try {
    const [hashed, salt] = stored.split('.');
    
    if (!salt) {
      console.log('Password salt missing');
      return false;
    }
    
    const hashedBuf = Buffer.from(hashed, 'hex');
    const suppliedBuf = await scryptAsync(supplied, salt, 64) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
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
      console.log('Attempting to find admin with email:', email.toLowerCase());
      const [adminUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()));

      if (!adminUser) {
        console.log('No admin found with email:', email.toLowerCase());
        throw new Error('Invalid email or password');
      }
      
      console.log('Found admin, verifying password...');
      
      // Verify password
      const passwordValid = await comparePasswords(password, adminUser.password || '');
      if (!passwordValid) {
        console.log('Password invalid for admin:', email.toLowerCase());
        throw new Error('Invalid email or password');
      }
      
      console.log('Password valid, admin login successful');

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
      // Get customer from database with all fields
      console.log('Attempting to find consignor with email:', email.toLowerCase());
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.email, email.toLowerCase()));

      if (!customer) {
        console.log('No consignor found with email:', email.toLowerCase());
        throw new Error('Invalid email or password');
      }

      console.log('Found consignor, verifying password...');
      
      // Verify password
      const passwordValid = await comparePasswords(password, customer.password || '');
      if (!passwordValid) {
        console.log('Password invalid for consignor:', email.toLowerCase());
        throw new Error('Invalid email or password');
      }

      console.log('Password valid, login successful');
      
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
      console.log('Registering new consignor with data:', {
        ...userData,
        password: '[REDACTED]'
      });
      
      // Check if email already exists
      const [existingUser] = await db
        .select()
        .from(customers)
        .where(eq(customers.email, userData.email.toLowerCase()));

      if (existingUser) {
        console.log('Email already registered:', userData.email.toLowerCase());
        throw new Error('Email already registered');
      }

      // Hash password
      console.log('Hashing password...');
      const hashedPassword = await hashPassword(userData.password);

      // Format user data for database schema
      const customerData = {
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        name: userData.name, // Use the name field from the updated schema
        phone: userData.phone || null,
        address: userData.address || null,
        city: userData.city || null,
        state: userData.state || null,
        postal_code: userData.postalCode || null,
        country: userData.country || null,
        created_at: new Date(),
        role: 'consignor' // Set the role directly
      };

      // Insert new customer
      console.log('Inserting new consignor into database...');
      const [newCustomer] = await db
        .insert(customers)
        .values(customerData)
        .returning();
      
      console.log('Registration successful, consignor created with ID:', newCustomer.id);

      return {
        ...newCustomer,
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
            // Name field already exists in database
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