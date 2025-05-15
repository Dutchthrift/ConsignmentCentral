// This script adds a test consignor to the database
import { Pool } from '@neondatabase/serverless';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { env } from 'process';

// Set up promisified scrypt
const scryptAsync = promisify(scrypt);

// Create hash for password
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function main() {
  try {
    // Create PostgreSQL client
    const pool = new Pool({
      connectionString: env.DATABASE_URL,
    });

    // Hash the password
    const hashedPassword = await hashPassword('password123');

    // Get current timestamp
    const now = new Date().toISOString();

    // Add test consignor
    const result = await pool.query(
      `INSERT INTO customers 
       (email, password, name, phone, address, city, country, role, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, email, name, role`,
      [
        'test@example.com',            // email
        hashedPassword,                 // password
        'Test Consignor',              // name (fullName)
        '+31612345678',                // phone
        'Test Street 123',             // address
        'Amsterdam',                    // city
        'NL',                          // country
        'consignor',                   // role
        now                            // created_at
      ]
    );

    console.log('Test consignor created:', result.rows[0]);

    // Close the connection
    await pool.end();
  } catch (error) {
    console.error('Error creating test consignor:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);