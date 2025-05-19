/**
 * Improved reference ID generator for Dutch Thrift
 * Creates unique, time-based reference IDs in the format CS-YYMMDD-XXXXX-XXX
 */

/**
 * Generate a unique reference ID with more randomness
 * @returns {string} Reference ID in format CS-YYMMDD-XXXXX-XXX
 */
export function generateUniqueReferenceId(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(5, '0');
  
  return `CS-${dateStr}-${random}-${milliseconds}`;
}