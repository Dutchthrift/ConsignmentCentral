import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    customerId?: number;
    userType?: 'admin' | 'consignor';
  }
}