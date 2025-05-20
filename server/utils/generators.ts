/**
 * Utility functions for generating IDs and references
 */

/**
 * Generate a unique reference ID for items
 */
export function generateReferenceId(): string {
  const prefix = 'ITM';
  const randomPart = Math.floor(100000 + Math.random() * 900000); // 6-digit number
  const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp
  return `${prefix}-${randomPart}-${timestamp}`;
}

/**
 * Generate a unique order number
 */
export function generateOrderNumber(): string {
  const prefix = 'ORD';
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
  const randomPart = Math.floor(10000 + Math.random() * 90000); // 5-digit number
  return `${prefix}-${datePart}-${randomPart}`;
}