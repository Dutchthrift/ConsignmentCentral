import { Request, Response } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import { IStorage } from "../storage";

// Promisify the scrypt function
const scryptAsync = promisify(scrypt);

// Define user types
export type UserTypeValues = 'admin' | 'consignor';

export interface TokenPayload {
  id: number;
  email: string;
  name?: string;
  role?: string;
  isAdmin?: boolean;
}

export class AuthService {
  private storage: IStorage;
  private jwtSecret: string;
  private tokenExpiration: string;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.tokenExpiration = process.env.TOKEN_EXPIRATION || '1d';
  }

  /**
   * Hash a password for storage
   */
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  /**
   * Compare stored password hash with provided password
   */
  async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  }

  /**
   * Generate a JWT token
   */
  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.tokenExpiration,
    });
  }

  /**
   * Verify a JWT token
   */
  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.jwtSecret) as TokenPayload;
    } catch (error) {
      console.error("Token verification error:", error);
      return null;
    }
  }

  /**
   * Verify admin credentials and return a user if valid
   */
  async verifyAdminCredentials(email: string, password: string) {
    try {
      const admin = await this.storage.getAdminUserByEmail(email);
      
      if (!admin) {
        return null;
      }
      
      const isValidPassword = await this.comparePasswords(password, admin.password);
      
      if (!isValidPassword) {
        return null;
      }
      
      return admin;
    } catch (error) {
      console.error("Admin verification error:", error);
      return null;
    }
  }

  /**
   * Verify consignor credentials and return a user if valid
   */
  async verifyConsignorCredentials(email: string, password: string) {
    try {
      const consignor = await this.storage.getUserByEmail(email);
      
      if (!consignor || consignor.role !== 'consignor') {
        return null;
      }
      
      const isValidPassword = await this.comparePasswords(password, consignor.password);
      
      if (!isValidPassword) {
        return null;
      }
      
      // Get the customer record if exists
      const customer = await this.storage.getCustomerByUserId(consignor.id);
      
      // Attach customer data to the consignor user
      return {
        ...consignor,
        customer
      };
    } catch (error) {
      console.error("Consignor verification error:", error);
      return null;
    }
  }

  /**
   * Register a new consignor
   */
  async registerConsignor(email: string, password: string, firstName: string, lastName: string) {
    try {
      // Check if user already exists
      const existingUser = await this.storage.getUserByEmail(email);
      
      if (existingUser) {
        return { success: false, message: "Email address already in use" };
      }
      
      // Hash the password
      const hashedPassword = await this.hashPassword(password);
      
      // Create the user
      const user = await this.storage.createUser({
        email,
        password: hashedPassword,
        name: `${firstName} ${lastName}`,
        role: 'consignor',
        provider: 'local',
        created_at: new Date(),
        last_login: null,
        external_id: null,
        profile_image_url: null
      });
      
      // Create the customer record associated with this user
      const customer = await this.storage.createCustomer({
        email,
        first_name: firstName,
        last_name: lastName,
        user_id: user.id,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      return { 
        success: true, 
        user: {
          ...user,
          customer
        }
      };
    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, message: "Registration failed", error };
    }
  }
}

export default AuthService;