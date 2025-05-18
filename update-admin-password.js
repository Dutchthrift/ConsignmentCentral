// This script updates the admin password in the database to use the correct format
import { Pool } from 'pg';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for SSL connections to Supabase
    }
  });

  try {
    // Update the admin user password
    const email = 'admin@dutchthrift.com';
    const newPassword = 'admin123'; // Use the same password for simplicity
    
    // Hash the password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update the admin user in the database
    const result = await pool.query(
      'UPDATE admin_users SET password = $1 WHERE email = $2 RETURNING id, email',
      [hashedPassword, email]
    );
    
    if (result.rows.length === 0) {
      console.error('Admin user not found');
      process.exit(1);
    }
    
    console.log(`Updated password for admin user: ${result.rows[0].email} (ID: ${result.rows[0].id})`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating admin password:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();