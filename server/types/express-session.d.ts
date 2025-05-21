import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    customerId?: number;
    userType?: 'admin' | 'consignor';
  }
}

// Define the UserTypeValues type for use in the application
declare global {
  type UserTypeValues = 'admin' | 'consignor';
}