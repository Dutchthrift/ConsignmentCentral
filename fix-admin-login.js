// This script creates a raw SQL query to fix the admin password
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
    // Use a plain password for admin until we resolve the hashing issue
    const plainPassword = 'admin123';
    
    // Update the admin user in the database with a plain password
    const result = await pool.query(
      'UPDATE admin_users SET password = $1 WHERE email = $2 RETURNING id, email',
      [plainPassword, 'admin@dutchthrift.com']
    );
    
    if (result.rows.length === 0) {
      console.error('Admin user not found');
      process.exit(1);
    }
    
    console.log(`Updated password for admin user: ${result.rows[0].email} (ID: ${result.rows[0].id})`);
    
    // Check if the admin now exists with the correct password format
    const check = await pool.query(
      'SELECT id, email, password FROM admin_users WHERE email = $1',
      ['admin@dutchthrift.com']
    );
    
    if (check.rows.length > 0) {
      console.log('Admin user exists with new password format:', {
        id: check.rows[0].id,
        email: check.rows[0].email,
        passwordLength: check.rows[0].password.length
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating admin password:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();