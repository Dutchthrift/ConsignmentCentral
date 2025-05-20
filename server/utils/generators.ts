/**
 * Utility functions for generating various IDs and reference numbers
 */

/**
 * Generates a random reference ID for items
 * Format: RmaXXXXXXXXXXXX (where X is alphanumeric)
 */
export function generateReferenceId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let referenceId = 'Rma';
  
  // Generate 10 random characters
  for (let i = 0; i < 10; i++) {
    referenceId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return referenceId;
}

/**
 * Generates an order number for new orders
 * Format: CS-DDMMYY-XXX-XXXX (CS = Consignment, date, random numbers)
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(2);
  
  // Generate random segments
  const randomSegment1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const randomSegment2 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `CS-${day}${month}${year}-${randomSegment1}-${randomSegment2}`;
}