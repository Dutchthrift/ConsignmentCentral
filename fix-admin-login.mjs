/**
 * This script fixes the admin login by resetting the password to match 
 * the credentials given to the user (admin@test.com/adminpass123)
 */
import pkg from 'pg';
const { Pool } = pkg;
import crypto from 'crypto';

// Hash password using scrypt (same method as in auth.service.ts)
async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    // Generate a salt
    const salt = crypto.randomBytes(16).toString('hex');
    
    // Hash the password with the salt
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      // Format as "hash.salt" for storage and verification
      resolve(`${derivedKey.toString('hex')}.${salt}`);
    });
  });
}

async function main() {
  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Set password to 'adminpass123'
    const hashedPassword = await hashPassword('adminpass123');
    
    // Update the admin user password
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email',
      [hashedPassword, 'admin@test.com']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Admin password reset successfully!');
      console.log('You can now log in with:');
      console.log('Email: admin@test.com');
      console.log('Password: adminpass123');
    } else {
      console.log('❌ No admin user found with email admin@test.com');
      
      // If no admin exists, create one
      console.log('Creating new admin user...');
      const newHashedPassword = await hashPassword('adminpass123');
      
      const insertResult = await pool.query(
        'INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, $4) RETURNING id, email',
        ['admin@test.com', 'Admin User', newHashedPassword, 'admin']
      );
      
      if (insertResult.rows.length > 0) {
        console.log('✅ Admin user created successfully!');
        console.log('You can now log in with:');
        console.log('Email: admin@test.com');
        console.log('Password: adminpass123');
      }
    }
  } catch (error) {
    console.error('Error updating admin password:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the function
main().catch(console.error);