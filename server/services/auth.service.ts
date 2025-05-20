import { IStorage } from "../storage";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import jwt from "jsonwebtoken";

const scryptAsync = promisify(scrypt);

export type UserTypeValues = 'admin' | 'consignor';

/**
 * Token payload interface for JWT
 */
export interface TokenPayload {
  id: number;
  email: string;
  name?: string;
  role?: string;
  isAdmin?: boolean;
}

/**
 * Authentication service for user authentication and authorization
 */
export class AuthService {
  private storage: IStorage;
  private jwtSecret: string;
  private tokenExpiration: string;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.jwtSecret = process.env.JWT_SECRET || "dutchthrift-jwt-secret";
    this.tokenExpiration = "24h";
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
    try {
      const [hashed, salt] = stored.split(".");
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      return timingSafeEqual(hashedBuf, suppliedBuf);
    } catch (error) {
      console.error("Error comparing passwords:", error);
      return false;
    }
  }

  /**
   * Generate a JWT token
   */
  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.tokenExpiration
    });
  }

  /**
   * Verify a JWT token
   */
  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.jwtSecret) as TokenPayload;
    } catch (error) {
      console.error("Error verifying token:", error);
      return null;
    }
  }

  /**
   * Verify admin credentials and return a user if valid
   */
  async verifyAdminCredentials(email: string, password: string) {
    try {
      // Find the admin user
      const adminUser = await this.storage.getAdminUserByEmail(email);
      
      if (!adminUser) {
        return null;
      }
      
      // Compare passwords
      const isValid = await this.comparePasswords(password, adminUser.password);
      
      if (!isValid) {
        return null;
      }
      
      // Return admin user (excluding password)
      const { password: _, ...adminUserWithoutPassword } = adminUser;
      return adminUserWithoutPassword;
    } catch (error) {
      console.error("Error verifying admin credentials:", error);
      return null;
    }
  }

  /**
   * Verify consignor credentials and return a user if valid
   */
  async verifyConsignorCredentials(email: string, password: string) {
    try {
      // Find the consignor user
      const consignorUser = await this.storage.getUserByEmail(email);
      
      if (!consignorUser) {
        return null;
      }
      
      // Compare passwords
      const isValid = await this.comparePasswords(password, consignorUser.password);
      
      if (!isValid) {
        return null;
      }
      
      // Get customer data if available
      const customer = await this.storage.getCustomerByUserId(consignorUser.id);
      
      // Return consignor user (excluding password)
      const { password: _, ...consignorUserWithoutPassword } = consignorUser;
      return {
        ...consignorUserWithoutPassword,
        customer
      };
    } catch (error) {
      console.error("Error verifying consignor credentials:", error);
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
        return {
          success: false,
          message: "Email already in use"
        };
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create new user with consignor role
      const user = await this.storage.createUser({
        email,
        password: hashedPassword,
        name: `${firstName} ${lastName}`,
        role: "consignor",
        provider: "local"
      });

      // Create customer record for the user
      const customer = await this.storage.createCustomer({
        email,
        firstName,
        lastName,
        userId: user.id
      });

      // Return success with user data (excluding password)
      const { password: _, ...userWithoutPassword } = user;
      return {
        success: true,
        user: {
          ...userWithoutPassword,
          customer
        }
      };
    } catch (error) {
      console.error("Error registering consignor:", error);
      return {
        success: false,
        message: "Error creating user"
      };
    }
  }
}