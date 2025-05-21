// Declare user type values
export type UserTypeValues = 'admin' | 'consignor';

// Re-export for use across the application
export const UserTypes = {
  ADMIN: 'admin' as UserTypeValues,
  CONSIGNOR: 'consignor' as UserTypeValues
};