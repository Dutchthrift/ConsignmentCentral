import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userType?: string; // Make this less strict
    userId?: string | number;
    customerId?: string | number;
  }
}