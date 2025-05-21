import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userType?: 'admin' | 'consignor';
    userId?: string;
    customerId?: string;
  }
}