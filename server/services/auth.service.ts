import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as AppleStrategy } from 'passport-apple';
import { IStorage } from '../storage';
import { Request, Response, NextFunction } from 'express';
import { User, AdminUser, UserType, UserRole } from '@shared/schema';
import SessionService from './session.service';
import { scrypt, randomBytes, timingSafeEqual, createHmac } from 'crypto';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';

export class AuthService {
  private storage: IStorage;
  private sessionService: SessionService;
  private scryptAsync = promisify(scrypt);
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'dutch-thrift-jwt-secret';
  private readonly TOKEN_EXPIRY = '7d'; // Token valid for 7 days

  constructor(storage: IStorage) {
    this.storage = storage;
    this.sessionService = new SessionService();
    this.initializePassport();
  }
  
  // Generate a JWT token for a user
  generateToken(user: User): string {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };
    
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.TOKEN_EXPIRY });
  }
  
  // Generate a JWT token for an admin user
  generateAdminToken(adminUser: AdminUser): string {
    const payload = {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      name: adminUser.name,
      isAdmin: true
    };
    
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.TOKEN_EXPIRY });
  }

  // Verify a JWT token
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
  
  // Middleware to authenticate using JWT token
  authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Try to get token from Authorization header
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
      
      if (token) {
        const decoded = this.verifyToken(token);
        if (decoded) {
          // Check if this is an admin token
          if (decoded.isAdmin) {
            const adminUser = await this.storage.getAdminUserById(decoded.id);
            if (adminUser) {
              // Set the admin user in the request
              req.user = adminUser;
              // Set admin user type in session
              if (req.session) {
                req.session.userType = UserType.ADMIN;
              }
              return next();
            }
          } else {
            // Regular user token
            const user = await this.storage.getUserById(decoded.id);
            if (user) {
              // Set the user in the request
              req.user = user;
              // Set customer user type in session
              if (req.session) {
                req.session.userType = UserType.CUSTOMER;
              }
              return next();
            }
          }
        }
      }
      
      // If no token or invalid token, proceed with regular session-based auth
      if (req.isAuthenticated()) {
        return next();
      }
      
      // If not authenticated by any method, return 401
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    } catch (error) {
      console.error('JWT authentication error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authentication error'
      });
    }
  }
  
  // Hash password for storage
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const buf = (await this.scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString('hex')}.${salt}`;
  }

  // Verify password against stored hash
  async verifyPassword(suppliedPassword: string, storedHash: string): Promise<boolean> {
    // Special case for unencrypted test passwords
    if (!storedHash.includes('.')) {
      console.log('Using plain text password comparison');
      return suppliedPassword === storedHash;
    }
    
    // Normal password verification
    const [hashedPassword, salt] = storedHash.split('.');
    const hashedPasswordBuf = Buffer.from(hashedPassword, 'hex');
    const suppliedPasswordBuf = (await this.scryptAsync(suppliedPassword, salt, 64)) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  }

  private initializePassport() {
    // Configure Local Strategy for email/password login
    passport.use('customer-local', new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    }, async (email, password, done) => {
      console.log('Customer local strategy call:', { email });
      try {
        // Find user by email
        const user = await this.storage.getUserByEmail(email);
        
        if (!user) {
          return done(null, false, { message: 'Incorrect email or password' });
        }
        
        // Check if this is an email-based account
        if (user.provider !== 'local') {
          return done(null, false, { 
            message: `This email is associated with a ${user.provider} account` 
          });
        }
        
        // Verify password
        const isValid = await this.verifyPassword(password, user.password || '');
        
        if (!isValid) {
          return done(null, false, { message: 'Incorrect email or password' });
        }
        
        // Set user type in session
        if (done.req && done.req.session) {
          done.req.session.userType = UserType.CUSTOMER;
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }));
    
    // Configure Admin Local Strategy
    passport.use('admin-local', new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true
    }, async (req, email, password, done) => {
      console.log('Admin local strategy call:', { email });
      try {
        // Find admin user by email
        const adminUser = await this.storage.getAdminUserByEmail(email);
        
        if (!adminUser) {
          return done(null, false, { message: 'Incorrect admin credentials' });
        }
        
        // Verify password
        const isValid = await this.verifyPassword(password, adminUser.password || '');
        
        if (!isValid) {
          return done(null, false, { message: 'Incorrect admin credentials' });
        }
        
        // Set admin type in session
        if (req.session) {
          req.session.userType = UserType.ADMIN;
        }
        
        return done(null, adminUser);
      } catch (error) {
        return done(error);
      }
    }));
    
    // Serialize user to session
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    // Deserialize user from session with enhanced error handling
    passport.deserializeUser(async (id: number, done) => {
      try {
        // Add timeouts to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database timeout')), 5000);
        });
        
        // Race the database query with a timeout
        const user = await Promise.race([
          this.storage.getUserById(id),
          timeoutPromise
        ]) as any;
        
        if (!user) {
          console.warn(`User not found during session deserialization: ${id}`);
          // Instead of throwing an error, just return null to force re-login
          return done(null, null);
        }
        
        // Try to update last login, but don't block if it fails
        this.storage.updateUserLastLogin(id).catch(err => {
          console.warn('Failed to update last login time:', err);
        });
        
        done(null, user);
      } catch (error) {
        console.error('Error deserializing user:', error);
        // Return null instead of the error to prevent crashes
        done(null, null);
      }
    });

    // Configure Google Strategy
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      passport.use(
        new GoogleStrategy(
          {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: '/api/auth/google/callback'
          },
          async (accessToken, refreshToken, profile, done) => {
            try {
              // Check if user exists by their Google ID
              let user = await this.storage.getUserByExternalId(
                profile.id,
                'google'
              );

              if (!user) {
                // Create new user if they don't exist
                user = await this.storage.createUser({
                  name: profile.displayName,
                  email: profile.emails && profile.emails[0] ? profile.emails[0].value : '',
                  provider: 'google',
                  externalId: profile.id,
                  role: 'user', // Default role
                  profileImageUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null
                });
              }

              return done(null, user);
            } catch (error) {
              return done(error as Error);
            }
          }
        )
      );
    }

    // Configure Apple Strategy
    if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID) {
      passport.use(
        new AppleStrategy(
          {
            clientID: process.env.APPLE_CLIENT_ID,
            teamID: process.env.APPLE_TEAM_ID,
            keyID: process.env.APPLE_KEY_ID,
            privateKeyString: process.env.APPLE_PRIVATE_KEY,
            callbackURL: '/api/auth/apple/callback',
            passReqToCallback: true
          },
          async (req, accessToken, refreshToken, idToken, profile, done) => {
            try {
              // Apple profile does not always provide name and email after the first login
              // Use data from the initial request if available
              let email = profile.email;
              let name = profile.name ? `${profile.name.firstName} ${profile.name.lastName}` : '';
              
              // Check if user exists by their Apple ID
              let user = await this.storage.getUserByExternalId(
                profile.id,
                'apple'
              );

              if (!user) {
                // Create new user if they don't exist
                user = await this.storage.createUser({
                  name: name || 'Apple User',
                  email: email || '',
                  provider: 'apple',
                  externalId: profile.id,
                  role: 'user'
                });
              }

              return done(null, user);
            } catch (error) {
              return done(error as Error);
            }
          }
        )
      );
    }
  }

  getAuthMiddleware() {
    return passport.initialize();
  }

  getSessionMiddleware() {
    // Add a wrapper around the session middleware to catch any errors
    const sessionMiddleware = this.sessionService.getSessionMiddleware();
    
    return (req: any, res: any, next: any) => {
      try {
        sessionMiddleware(req, res, (err: any) => {
          if (err) {
            console.error('Session middleware error:', err);
            // Continue even with session errors to prevent crashes
            return next();
          }
          return next();
        });
      } catch (error) {
        console.error('Uncaught session error:', error);
        // Continue even with session errors to prevent crashes
        return next();
      }
    };
  }

  // Check if the user is an admin
  isAdmin(req: Request): boolean {
    return req.isAuthenticated() && req.user && (req.user as User).role === 'admin';
  }
}

export default AuthService;