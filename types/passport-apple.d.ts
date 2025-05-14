declare module 'passport-apple' {
  import { Request } from 'express';
  import { Strategy as PassportStrategy } from 'passport';

  export interface AppleStrategyOptions {
    clientID: string;
    teamID: string;
    keyID: string;
    privateKeyString?: string;
    privateKeyPath?: string;
    callbackURL: string;
    passReqToCallback?: boolean;
    scope?: string[];
  }

  export interface AppleProfile {
    id: string;
    name?: {
      firstName: string;
      lastName: string;
    };
    email?: string;
  }

  export interface AppleIDToken {
    sub: string;
    email?: string;
  }

  export class Strategy extends PassportStrategy {
    constructor(
      options: AppleStrategyOptions,
      verify: (
        req: Request,
        accessToken: string,
        refreshToken: string,
        idToken: AppleIDToken,
        profile: AppleProfile,
        done: (error: any, user?: any, info?: any) => void
      ) => void
    );
  }
}