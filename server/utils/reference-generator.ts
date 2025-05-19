/**
 * Reference ID Generator
 * Generates unique reference IDs for consignment items
 */

/**
 * Generates a unique reference ID for an item in the format CS-YYMMDD-XXX
 * @returns {string} Unique reference ID
 */
export function generateReferenceId(): string {
  // Get current date in format YYMMDD
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Generate random 3-digit number
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  // Return reference ID in format CS-YYMMDD-XXX
  return `CS-${dateStr}-${random}`;
}