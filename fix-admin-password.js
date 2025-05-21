/**
 * This script resets the admin password to match what we've told the user
 */
import pkg from 'pg';
const { Pool } = pkg;
import crypto from 'crypto';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Hash password using the same method as the auth service
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

async function resetAdminPassword() {
  const client = await pool.connect();
  
  try {
    // Set the new password
    const newPassword = 'adminpass123';
    const hashedPassword = await hashPassword(newPassword);
    
    // Update the admin password
    const result = await client.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email',
      [hashedPassword, 'admin@test.com']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Admin password reset successfully for:', result.rows[0].email);
      console.log('New login credentials:');
      console.log('Email: admin@test.com');
      console.log('Password: adminpass123');
    } else {
      console.log('❌ No admin user found with email admin@test.com');
    }
  } catch (error) {
    console.error('Error resetting admin password:', error);
  } finally {
    client.release();
  }
}

// Run the function
resetAdminPassword().finally(() => pool.end());