import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    customerId?: number;
    userType?: string;
  }
}

// No need for the global UserTypeValues type declaration
// We'll use string directly for the userType session value