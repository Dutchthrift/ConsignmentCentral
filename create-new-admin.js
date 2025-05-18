// This script creates a new admin user with the correct password format
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
    // Create a new admin user with a hashed password
    const email = 'superadmin@dutchthrift.com';
    const password = 'admin123';
    const name = 'Super Admin';
    
    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Check if user already exists
    const checkResult = await pool.query(
      'SELECT id FROM admin_users WHERE email = $1',
      [email]
    );
    
    if (checkResult.rows.length > 0) {
      console.log(`Admin user ${email} already exists, updating password...`);
      
      // Update password for existing user
      const updateResult = await pool.query(
        'UPDATE admin_users SET password = $1 WHERE email = $2 RETURNING id, email',
        [hashedPassword, email]
      );
      
      console.log(`Updated password for admin user: ${updateResult.rows[0].email} (ID: ${updateResult.rows[0].id})`);
    } else {
      // Insert new admin user
      const insertResult = await pool.query(
        `INSERT INTO admin_users (
          email, 
          password, 
          name, 
          role, 
          provider, 
          last_login, 
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email`,
        [email, hashedPassword, name, 'admin', 'local', new Date(), new Date()]
      );
      
      console.log(`Created new admin user: ${insertResult.rows[0].email} (ID: ${insertResult.rows[0].id})`);
    }
    
    console.log('Admin credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();