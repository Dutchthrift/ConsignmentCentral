import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    customerId?: number;
    userType?: string;
  }
}

// Define the UserTypeValues type for global use
declare global {
  // Use a string union type that matches the actual values used
  type UserTypeValues = string;
}