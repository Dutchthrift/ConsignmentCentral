import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as AppleStrategy } from 'passport-apple';
import { IStorage } from '../storage';
import { User } from '@shared/schema';
import { Request } from 'express';

export class AuthService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.configurePassport();
  }

  /**
   * Configure passport strategies and serialization/deserialization
   */
  private configurePassport() {
    // Serialize user to session
    passport.serializeUser((user: User, done) => {
      done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id: number, done) => {
      try {
        const user = await this.storage.getUserById(id);
        done(null, user || false);
      } catch (error) {
        done(error, false);
      }
    });

    // Configure Google OAuth strategy
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      passport.use(
        new GoogleStrategy(
          {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: '/api/auth/google/callback',
            passReqToCallback: true
          },
          async (req: Request, accessToken, refreshToken, profile, done) => {
            try {
              // Check if user already exists with this external ID
              let user = await this.storage.getUserByExternalId(profile.id, 'google');
              
              if (!user) {
                // Create new user if doesn't exist
                const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
                if (!email) {
                  return done(new Error('No email provided from Google'), false);
                }
                
                // Check if user exists with same email
                const existingUserWithEmail = await this.storage.getUserByEmail(email);
                if (existingUserWithEmail) {
                  // Link existing user to Google account
                  user = await this.storage.updateUserExternalId(existingUserWithEmail.id, profile.id, 'google');
                } else {
                  // Create brand new user
                  user = await this.storage.createUser({
                    name: profile.displayName || email.split('@')[0],
                    email,
                    role: 'consignor', // Default role for new users
                    externalId: profile.id,
                    provider: 'google',
                  });
                }
              } else {
                // Update last login time for existing user
                user = await this.storage.updateUserLastLogin(user.id);
              }
              
              return done(null, user);
            } catch (error) {
              return done(error, false);
            }
          }
        )
      );
    }

    // Configure Apple OAuth strategy
    if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
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
          async (req: Request, accessToken, refreshToken, idToken, profile, done) => {
            try {
              // Apple provides user details only on the first login
              // We need to handle that case specially by checking the request body
              const email = profile?.email || (req.body && req.body.user ? JSON.parse(req.body.user).email : null);
              const name = profile?.name || (req.body && req.body.user ? JSON.parse(req.body.user).name : null);
              
              if (!email) {
                return done(new Error('No email provided from Apple'), false);
              }
              
              // Check if user already exists with this external ID
              let user = await this.storage.getUserByExternalId(idToken.sub, 'apple');
              
              if (!user) {
                // Check if user exists with same email
                const existingUserWithEmail = await this.storage.getUserByEmail(email);
                if (existingUserWithEmail) {
                  // Link existing user to Apple account
                  user = await this.storage.updateUserExternalId(existingUserWithEmail.id, idToken.sub, 'apple');
                } else {
                  // Create brand new user
                  const displayName = name ? `${name.firstName} ${name.lastName}` : email.split('@')[0];
                  user = await this.storage.createUser({
                    name: displayName,
                    email,
                    role: 'consignor', // Default role for new users
                    externalId: idToken.sub,
                    provider: 'apple',
                  });
                }
              } else {
                // Update last login time for existing user
                user = await this.storage.updateUserLastLogin(user.id);
              }
              
              return done(null, user);
            } catch (error) {
              return done(error, false);
            }
          }
        )
      );
    }
  }

  /**
   * Get the authentication middleware
   */
  getAuthMiddleware() {
    return passport.initialize();
  }

  /**
   * Get the session middleware
   */
  getSessionMiddleware() {
    return passport.session();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(req: Request) {
    return req.isAuthenticated();
  }

  /**
   * Check if user has admin role
   */
  isAdmin(req: Request) {
    return req.isAuthenticated() && req.user && (req.user as User).role === 'admin';
  }

  /**
   * Check if user is authenticated and has the specified role
   */
  hasRole(req: Request, role: string) {
    return req.isAuthenticated() && req.user && (req.user as User).role === role;
  }
}