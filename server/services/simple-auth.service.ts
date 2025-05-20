import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Request, Response, NextFunction } from 'express';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import SessionService from './session.service';

// User type enumeration for session management
export enum UserType {
  USER = 'user',
  ADMIN = 'admin',
  CUSTOMER = 'customer'
}

export class AuthService {
  private storage: any;
  private sessionService: SessionService;
  private scryptAsync = promisify(scrypt);
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'dutch-thrift-jwt-secret';
  private readonly TOKEN_EXPIRY = '7d'; // Token valid for 7 days

  constructor(storage: any) {
    this.storage = storage;
    this.sessionService = new SessionService();
    this.initializePassport();
    console.log('Auth service initialized with simplified implementation');
  }

  generateToken(user: any): string {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name || '',
      type: 'user'
    };

    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.TOKEN_EXPIRY });
  }

  generateAdminToken(adminUser: any): string {
    const payload = {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      name: adminUser.name || '',
      type: 'admin'
    };

    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.TOKEN_EXPIRY });
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (e) {
      return null;
    }
  }

  authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
  
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      
      try {
        const decodedToken = jwt.verify(token, this.JWT_SECRET) as any;
        
        // Attach user info to request for route handlers to use
        req.user = {
          id: decodedToken.id,
          email: decodedToken.email,
          role: decodedToken.role,
          type: decodedToken.type
        };
        
        next();
      } catch (error) {
        console.error("JWT verification failed:", error);
        return res.status(403).json({ message: "Invalid or expired token" });
      }
    } else {
      return res.status(401).json({ message: "Authentication token required" });
    }
  };

  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const buffer = (await this.scryptAsync(password, salt, 64)) as Buffer;
    return `${buffer.toString('hex')}.${salt}`;
  }

  async verifyPassword(suppliedPassword: string, storedHash: string): Promise<boolean> {
    if (!storedHash) return false;
    const [hash, salt] = storedHash.split('.');
    if (!hash || !salt) return false;
    
    const keyBuffer = (await this.scryptAsync(suppliedPassword, salt, 64)) as Buffer;
    const storedHashBuffer = Buffer.from(hash, 'hex');
    
    return timingSafeEqual(keyBuffer, storedHashBuffer);
  }

  private initializePassport() {
    passport.use(new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    }, async (email, password, done) => {
      console.log("Authenticating user:", email);
      
      // Hard-coded testing credentials for development
      if (email === 'admin@dutchthrift.com' && password === 'admin123') {
        console.log("Using fallback admin credentials");
        return done(null, {
          id: 1,
          email: 'admin@dutchthrift.com',
          role: 'admin',
          isAdmin: true,
          name: 'Admin User'
        });
      }
      
      if (email === 'theooenema@hotmail.com' && password === 'password123') {
        console.log("Using fallback consignor credentials");
        return done(null, {
          id: 2,
          email: 'theooenema@hotmail.com',
          role: 'user',
          isAdmin: false,
          name: 'Theo Oenema',
          customer_id: 12
        });
      }
      
      // Try to authenticate admin users first
      try {
        const adminUsers = await this.storage.getAllAdminUsers();
        const adminUser = adminUsers.find((user: any) => user.email === email);
        
        if (adminUser) {
          const isValid = await this.verifyPassword(password, adminUser.password || '');
          
          if (isValid) {
            console.log("Admin authentication successful");
            return done(null, adminUser);
          }
        }
      } catch (error) {
        console.error("Error finding admin user:", error);
      }
      
      // Try regular users
      try {
        const user = await this.storage.getUserByEmail(email);
        
        if (user) {
          const isValid = await this.verifyPassword(password, user.password || '');
          
          if (isValid) {
            await this.storage.updateUserLastLogin(user.id);
            console.log("User authentication successful");
            return done(null, user);
          }
        }
      } catch (error) {
        console.error("Error in user authentication:", error);
      }
      
      return done(null, false, { message: 'Incorrect email or password' });
    }));
    
    passport.serializeUser((user: any, done) => {
      console.log('Serializing user:', user.id);
      done(null, { id: user.id, type: user.role || 'user' });
    });
    
    passport.deserializeUser(async (serialized: { id: number, type: string }, done) => {
      console.log('Deserializing user:', serialized);
      
      // Hardcoded fallback for our test users
      if (serialized.id === 1 && serialized.type === 'admin') {
        console.log('Using fallback admin user for deserialization');
        return done(null, {
          id: 1,
          email: 'admin@dutchthrift.com',
          role: 'admin',
          isAdmin: true,
          name: 'Admin User'
        });
      }
      
      if (serialized.id === 2 && (serialized.type === 'user' || serialized.type === 'customer')) {
        console.log('Using fallback consignor user for deserialization');
        return done(null, {
          id: 2,
          email: 'theooenema@hotmail.com',
          role: 'user',
          isAdmin: false,
          name: 'Theo Oenema',
          customer_id: 12
        });
      }
      
      // Try normal database lookup as fallback
      try {
        // Only attempt database lookups if the required methods exist
        if (serialized.type === 'admin' && typeof this.storage.getAllAdminUsers === 'function') {
          try {
            const adminUsers = await this.storage.getAllAdminUsers();
            const adminUser = adminUsers.find((user: any) => user.id === serialized.id);
            
            if (adminUser) {
              return done(null, adminUser);
            }
          } catch (err) {
            console.log('Admin lookup error (non-critical):', err.message);
          }
        } else if (typeof this.storage.getUserById === 'function') {
          try {
            const user = await this.storage.getUserById(serialized.id);
            
            if (user) {
              return done(null, user);
            }
          } catch (err) {
            console.log('User lookup error (non-critical):', err.message);
          }
        }
        
        // If we get here, user wasn't found but we'll return null instead of error
        // This avoids crashing the application
        console.log(`User not found for ID: ${serialized.id}, but continuing with null`);
        return done(null, null);
      } catch (error) {
        console.error("Error deserializing user:", error);
        // Return null instead of error to avoid crashing
        return done(null, null);
      }
    });
  }
  
  getAuthMiddleware() {
    return [
      passport.initialize(),
      passport.session()
    ];
  }
  
  getSessionMiddleware() {
    return this.sessionService.getSessionMiddleware();
  }
  
  isAdmin(req: Request): boolean {
    return req.isAuthenticated() && req.user && (req.user as any).role === 'admin';
  }
}