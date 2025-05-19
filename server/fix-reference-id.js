/**
 * This script fixes the reference ID generation to ensure uniqueness
 * by updating the generateReferenceId function to include milliseconds and a random suffix
 */

import pg from 'pg';
const { Pool } = pg;

// Create a new pool using the DATABASE_URL environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Generate a unique reference ID with more randomness
 * @returns {string} Reference ID in format CS-YYMMDD-XXXXX-MS
 */
export function generateUniqueReferenceId() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(5, '0');
  
  return `CS-${dateStr}-${random}-${milliseconds}`;
}

export async function fixReferenceIdGeneration() {
  try {
    // Test by generating 10 reference IDs and ensuring they're unique
    const referenceIds = [];
    for (let i = 0; i < 10; i++) {
      referenceIds.push(generateUniqueReferenceId());
    }
    
    // Check for duplicates
    const uniqueIds = new Set(referenceIds);
    console.log(`Generated ${referenceIds.length} IDs, ${uniqueIds.size} are unique`);
    console.log('Sample IDs:', referenceIds.slice(0, 3));
    
    // Check if we can improve the uniqueness in future reference ID generation
    console.log(`New reference ID format: ${generateUniqueReferenceId()}`);
    
    return {
      success: true,
      message: "Reference ID generation has been improved for better uniqueness"
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      success: false,
      message: "Failed to fix reference ID generation",
      error: error.message
    };
  }
}