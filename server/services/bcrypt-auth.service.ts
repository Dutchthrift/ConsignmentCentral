/**
 * Enhanced authentication service that uses bcrypt for password hashing
 * and properly stores user data in the customers table
 */
import { db, pool } from '../db';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { customers } from '@shared/schema';

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare passwords using bcrypt
 */
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    return await bcrypt.compare(supplied, stored);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

/**
 * Authentication service
 */
export default class BcryptAuthService {
  /**
   * Register a new consignor in the customers table
   */
  async registerConsignor(customerData: any): Promise<any> {
    console.log('Registering new consignor with bcrypt auth service');
    
    try {
      // Check if user already exists
      const existingUser = await this.findConsignorByEmail(customerData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }
      
      // Hash the password using bcrypt
      const hashedPassword = await hashPassword(customerData.password);
      
      // Insert new customer into the customers table with proper role
      const insertData = {
        ...customerData,
        password: hashedPassword,
        role: 'consignor',
        created_at: new Date()
      };
      
      // Use direct query to ensure compatibility with Supabase
      const result = await pool.query(`
        INSERT INTO customers (
          email, password, name, phone, address, city, state, postal_code, country, role, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        ) RETURNING *
      `, [
        insertData.email.toLowerCase(),
        insertData.password,
        insertData.name,
        insertData.phone || null,
        insertData.address || null,
        insertData.city || null,
        insertData.state || null,
        insertData.postal_code || null,
        insertData.country || 'NL',
        insertData.role,
        insertData.created_at
      ]);
      
      const newCustomer = result.rows[0];
      
      console.log('Consignor registered successfully with ID:', newCustomer.id);
      
      return {
        ...newCustomer,
        role: 'consignor'
      };
    } catch (error) {
      console.error('Error registering consignor:', error);
      throw error;
    }
  }
  
  /**
   * Login a consignor
   */
  async loginConsignor(email: string, password: string): Promise<any> {
    console.log('Attempting to log in consignor with email:', email);
    
    try {
      // Find the consignor by email
      const consignor = await this.findConsignorByEmail(email);
      
      if (!consignor) {
        console.log('No consignor found with email:', email);
        throw new Error('Invalid email or password');
      }
      
      // Verify the password using bcrypt
      const passwordValid = await comparePasswords(password, consignor.password);
      
      if (!passwordValid) {
        console.log('Invalid password for consignor:', email);
        throw new Error('Invalid email or password');
      }
      
      console.log('Consignor login successful for:', email);
      
      // Update last login time
      await pool.query(
        'UPDATE customers SET last_login = NOW() WHERE id = $1',
        [consignor.id]
      );
      
      // Return the consignor data (excluding password)
      const { password: _, ...consignorData } = consignor;
      
      return {
        ...consignorData,
        role: 'consignor'
      };
    } catch (error) {
      console.error('Consignor login error:', error);
      throw error;
    }
  }
  
  /**
   * Find a consignor by email
   */
  async findConsignorByEmail(email: string): Promise<any> {
    console.log('Attempting to find consignor with email:', email.toLowerCase());
    
    try {
      // Query the customers table directly
      const result = await pool.query(
        'SELECT * FROM customers WHERE email = $1 AND role = $2',
        [email.toLowerCase(), 'consignor']
      );
      
      if (result.rows.length === 0) {
        console.log('No consignor found with email:', email.toLowerCase());
        return null;
      }
      
      console.log('Found consignor:', email.toLowerCase());
      return result.rows[0];
    } catch (error) {
      console.error('Error finding consignor:', error);
      throw error;
    }
  }
  
  /**
   * Get current user data based on session information
   */
  async getCurrentUser(userId?: number, customerId?: number, userType?: string): Promise<any> {
    console.log('getCurrentUser called with:', { userId, customerId, userType });
    
    if (!userId && !customerId) {
      return null;
    }
    
    try {
      if (userType === 'admin' && userId) {
        // Handle admin user
        const result = await pool.query(
          'SELECT id, email, name, "role" FROM users WHERE id = $1',
          [userId]
        );
        
        if (result.rows.length === 0) {
          return null;
        }
        
        return {
          ...result.rows[0],
          role: 'admin'
        };
      } else if (userType === 'consignor' && customerId) {
        // Handle consignor user
        console.log('Looking up consignor with ID:', customerId);
        
        const result = await pool.query(
          'SELECT id, email, name, phone, address, city, state, postal_code, country FROM customers WHERE id = $1',
          [customerId]
        );
        
        if (result.rows.length === 0) {
          return null;
        }
        
        console.log('Found consignor:', result.rows[0].email);
        
        return {
          ...result.rows[0],
          role: 'consignor'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      throw error;
    }
  }
}