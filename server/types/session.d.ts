import { UserType } from '@shared/schema';
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userType?: UserType;
  }
}