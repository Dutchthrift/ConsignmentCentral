import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as AppleStrategy } from 'passport-apple';
import { IStorage } from '../storage';
import { Request } from 'express';
import { User } from '@shared/schema';
import SessionService from './session.service';

export class AuthService {
  private storage: IStorage;
  private sessionService: SessionService;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.sessionService = new SessionService();
    this.initializePassport();
  }

  private initializePassport() {
    // Serialize user to session
    passport.serializeUser((user: User, done) => {
      done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id: number, done) => {
      try {
        const user = await this.storage.getUserById(id);
        if (!user) {
          return done(new Error('User not found'));
        }
        
        // Update last login time
        await this.storage.updateUserLastLogin(id);
        
        done(null, user);
      } catch (error) {
        done(error);
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
    return this.sessionService.getSessionMiddleware();
  }

  // Check if the user is an admin
  isAdmin(req: Request): boolean {
    return req.isAuthenticated() && req.user && (req.user as User).role === 'admin';
  }
}

export default AuthService;