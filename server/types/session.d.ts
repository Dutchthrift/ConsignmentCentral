import { UserType } from '@shared/schema';
import 'express-session';

// Create a type that represents the string values of UserType
type UserTypeValues = typeof UserType[keyof typeof UserType];

declare module 'express-session' {
  interface SessionData {
    userType?: UserTypeValues;
  }
}