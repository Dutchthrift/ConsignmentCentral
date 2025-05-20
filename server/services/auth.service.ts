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

  constructor(storage: IStorage) {
    this.storage = storage;
    this.sessionService = new SessionService();
    this.initializePassport();
  }
  
  // Generate a JWT token for a user or customer
  generateToken(user: User | Customer): string {
    // Create a generic payload with common fields
    const payload: any = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    
    // Add name or fullName depending on the user type
    if ('name' in user) {
      payload.name = user.name;
    } else if ('fullName' in user) {
      payload.name = user.fullName; // Use fullName but store as name for consistency
    }
    
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.TOKEN_EXPIRY });
  }
  
  // Generate a JWT token for an admin user
  generateAdminToken(adminUser: AdminUser | any): string {
    const payload = {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role || 'admin',
      name: adminUser.name,
      isAdmin: true
    };
    
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.TOKEN_EXPIRY });
  }

  // Verify a JWT token
  verifyToken(token: string): any {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET);
      console.log('JWT token verification successful:', decoded);
      return decoded;
    } catch (error) {
      console.error('JWT token verification failed:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }
  
  // Middleware to authenticate using JWT token (Admin only for now)
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
          }
          // No customer token checking for now
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
    if (!storedHash || !storedHash.includes('.')) {
      console.log('Using plain text password comparison for Supabase authentication');
      return suppliedPassword === storedHash;
    }
    
    try {
      // Normal password verification
      const [hashedPassword, salt] = storedHash.split('.');
      const hashedPasswordBuf = Buffer.from(hashedPassword, 'hex');
      const suppliedPasswordBuf = (await this.scryptAsync(suppliedPassword, salt, 64)) as Buffer;
      return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
    } catch (error) {
      console.error('Password verification error:', error);
      // Fallback to direct comparison as last resort
      return suppliedPassword === storedHash;
    }
  }

  private initializePassport() {
    // Configure unified Local Strategy for email/password login (ADMIN AND CUSTOMERS)
    passport.use(new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true
    }, async (req, email, password, done) => {
      console.log('Local strategy call:', { email });
      try {
        // Use storage interface for authentication instead of direct DB query
        try {
          // First check if it's an admin user
          const adminUser = await this.storage.getAdminUserByEmail(email);
          
          if (adminUser) {
            console.log('Found admin user via storage interface:', { id: adminUser.id, email: adminUser.email });
            
            // Verify password (case insensitive comparison for migration period)
            const isValid = await this.verifyPassword(password, adminUser.password || '');
            
            if (isValid) {
              // Format admin user to match our expected schema
              const formattedAdminUser = {
                id: adminUser.id,
                email: adminUser.email,
                name: adminUser.name,
                role: adminUser.role || 'admin',
                provider: adminUser.provider || 'local',
                profileImageUrl: adminUser.profile_image_url,
                lastLogin: adminUser.last_login,
                createdAt: adminUser.created_at,
                password: adminUser.password // Keep password for verification
              };
              
              // Set admin type in session
              if (req.session) {
                req.session.userType = UserType.ADMIN;
                console.log("Admin user login, setting session userType to ADMIN");
              }
              
              // Update last login time
              try {
                await pool.query(
                  'UPDATE admin_users SET last_login = NOW() WHERE id = $1',
                  [adminUser.id]
                );
              } catch (updateError) {
                console.error('Error updating admin last login:', updateError);
                // Non-critical, continue with login
              }
              
              return done(null, formattedAdminUser);
            } else {
              console.log('Admin password verification failed');
              return done(null, false, { message: 'Incorrect email or password' });
            }
          }
        } catch (dbError) {
          console.error('Error in direct admin query:', dbError);
          // Continue with regular storage methods as fallback
        }
        
        try {
          // Try to find admin user in memory storage
          const adminUsers = await this.storage.getAllAdminUsers();
          const adminUser = adminUsers.find(user => user.email === email);
          
          if (adminUser) {
            // Found admin, verify password
            const isValid = await this.verifyPassword(password, adminUser.password || '');
            
            if (isValid) {
              // Set admin type in session
              if (req.session) {
                req.session.userType = UserType.ADMIN;
                console.log("Admin user login, setting session userType to ADMIN");
              }
              
              return done(null, adminUser);
            }
          }
        } catch (error) {
          console.error("Error finding admin user:", error);
        }
          
        // If we get here, authentication failed
        return done(null, false, { message: 'Incorrect email or password' });
        
        // Try direct database query for customers
        try {
          const customerResult = await pool.query(
            'SELECT * FROM customers WHERE email = $1',
            [email]
          );
          
          if (customerResult.rows.length > 0) {
            const customer = customerResult.rows[0];
            console.log('Found customer via direct query:', { id: customer.id, email: customer.email });
            
            // Verify password
            const isValid = await this.verifyPassword(password, customer.password || '');
            
            if (isValid) {
              // Format customer to match our expected schema
              const formattedCustomer = {
                id: customer.id,
                email: customer.email,
                name: customer.name,
                phone: customer.phone,
                address: customer.address,
                city: customer.city,
                state: customer.state,
                postal_code: customer.postal_code,
                country: customer.country,
                role: customer.role || 'customer',
                password: customer.password,
                created_at: customer.created_at
              };
              
              // Set customer type in session
              if (req.session) {
                req.session.userType = UserType.CUSTOMER;
                console.log("Customer login, setting session userType to CUSTOMER");
              }
              
              console.log("Customer authentication successful", { customerId: customer.id });
              return done(null, formattedCustomer);
            } else {
              console.log('Customer password verification failed');
              return done(null, false, { message: 'Incorrect email or password' });
            }
          }
        } catch (dbError) {
          console.error('Error in direct customer query:', dbError);
          // Continue with regular storage methods as fallback
        }
        
        // If no admin found, try customer via regular storage
        const customer = await this.storage.getCustomerByEmail(email);
        
        if (!customer) {
          return done(null, false, { message: 'Incorrect email or password' });
        }
        
        // Verify customer password
        const isCustomerValid = await this.verifyPassword(password, customer.password || '');
        
        if (!isCustomerValid) {
          return done(null, false, { message: 'Incorrect email or password' });
        }
        
        // Set customer type in session
        if (req.session) {
          req.session.userType = UserType.CUSTOMER;
          console.log("Customer login, setting session userType to CUSTOMER");
        }
        
        console.log("Customer authentication successful", { customerId: customer.id });
        return done(null, customer);
      } catch (error) {
        console.error("Authentication error:", error);
        return done(error);
      }
    }));
    
    // Admin authentication is now handled by the unified local strategy
    
    // Serialize user to session - store user type along with ID for both admin and customer
    passport.serializeUser((user: any, done) => {
      // For Supabase compatibility, determine user type from other properties
      // Check for specific fields or rely on role
      let userType = 'unknown';
      
      // Check if this is a formatted entity from direct DB query
      if (user.role === 'admin' || user.role === UserRole.ADMIN) {
        userType = 'admin';
      } else if (user.role === 'customer' || user.role === 'consignor' || user.postal_code !== undefined) {
        userType = 'customer';
      } else {
        // Fallback check: fields specific to each type
        const hasCustomerFields = user.postal_code !== undefined || user.phone !== undefined || user.address !== undefined;
        if (hasCustomerFields) {
          userType = 'customer';
        } else {
          userType = 'admin'; // Default assumption for now
        }
      }
      
      console.log(`Serializing ${userType} with ID ${user.id}`);
      done(null, { id: user.id, type: userType });
    });

    // Deserialize user from session with enhanced error handling for both admin and customer
    passport.deserializeUser(async (serialized: { id: number, type: string } | number, done) => {
      try {
        // Handle both new format (object with type) and legacy format (just ID)
        let id: number;
        let type: string = 'admin'; // Default to admin for legacy format
        
        if (typeof serialized === 'object' && serialized !== null) {
          id = serialized.id;
          type = serialized.type || 'admin';
        } else {
          id = serialized as number;
        }
        
        // Add timeouts to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database timeout')), 5000);
        });
        
        console.log(`Deserializing ${type} with ID ${id}`);
        
        // Choose the right retrieval method based on user type
        let userPromise;
        if (type === 'customer') {
          userPromise = this.storage.getCustomer(id);
        } else {
          userPromise = this.storage.getAdminUserById(id);
        }
        
        // Race the database query with a timeout
        const user = await Promise.race([
          userPromise,
          timeoutPromise
        ]) as any;
        
        if (!user) {
          console.warn(`${type} not found during session deserialization: ${id}`);
          // Instead of throwing an error, just return null to force re-login
          return done(null, null);
        }
        
        // Try to update last login, but don't block if it fails
        if (type === 'admin') {
          this.storage.updateAdminUserLastLogin(id).catch(err => {
            console.warn('Failed to update last login time for admin:', err);
          });
        }
        
        console.log(`${type} deserialized: ${user.email}`);
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
              const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
              
              // First check if a customer exists with this email
              let customer = await this.storage.getCustomerByEmail(email);
              
              if (customer) {
                // If the customer exists, but doesn't have the google ID associated yet, update it
                // This would typically be skipped in the current implementation
                return done(null, customer);
              }
              
              // If no customer, check if an existing user exists by their Google ID
              let user = await this.storage.getUserByExternalId(
                profile.id,
                'google'
              );

              if (!user) {
                // Create new user if they don't exist
                user = await this.storage.createUser({
                  name: profile.displayName,
                  email: email,
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
              
              // First check if a customer exists with this email
              if (email) {
                let customer = await this.storage.getCustomerByEmail(email);
                
                if (customer) {
                  // Found customer with this email, use it
                  return done(null, customer);
                }
              }
              
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
    return req.isAuthenticated() && 
           (req.session?.userType === UserType.ADMIN || 
            (req.user && (req.user as any).role === UserRole.ADMIN));
  }
}

export default AuthService;