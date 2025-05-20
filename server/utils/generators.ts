/**
 * Utility functions for generating reference IDs and order numbers
 */

// Generate a unique reference ID for items
export function generateReferenceId(): string {
  const timestamp = Date.now().toString(36);
  const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DT-${timestamp}-${randomChars}`;
}

// Generate an order number
export function generateOrderNumber(): string {
  const prefix = 'ORD';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
}