// Simple script to check environment variables
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log("Checking environment variables...");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? 
  process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@') : 
  'Not set');
console.log("USE_SUPABASE:", process.env.USE_SUPABASE);
console.log("NODE_ENV:", process.env.NODE_ENV);

// Check if the DATABASE_URL is set in the actual environment (not just .env file)
if (process.env.DATABASE_URL) {
  console.log("DATABASE_URL is correctly set in the environment");
} else {
  console.log("DATABASE_URL is not set in the environment");
}