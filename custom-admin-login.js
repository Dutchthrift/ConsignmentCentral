// Custom script to create a JWT token for admin login
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dutch-thrift-jwt-secret';
const TOKEN_EXPIRY = '30d'; // Longer expiry for testing

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
    // Get the admin user from the database
    const adminEmail = 'admin@dutchthrift.com';
    
    const result = await pool.query(
      'SELECT id, email, name, role FROM admin_users WHERE email = $1',
      [adminEmail]
    );
    
    if (result.rows.length === 0) {
      console.error('Admin user not found');
      process.exit(1);
    }
    
    const adminUser = result.rows[0];
    
    // Generate a JWT token for the admin user
    const payload = {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      name: adminUser.name,
      isAdmin: true
    };
    
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    
    console.log('Admin authentication token generated:');
    console.log('----------------------------------');
    console.log(token);
    console.log('----------------------------------');
    console.log('Copy this token and use it in the Authorization header as:');
    console.log('Bearer <token>');
    
    // Save the token to a file for easy access
    const fs = require('fs');
    fs.writeFileSync('admin-token.json', JSON.stringify({ 
      token, 
      user: adminUser,
      instructions: "Add this token to localStorage in your browser with the key 'authToken'"
    }, null, 2));
    
    console.log('Token saved to admin-token.json');
    console.log('You can now use this token for API authentication');
    console.log('Or add it to localStorage in your browser with the key "authToken"');
    
    process.exit(0);
  } catch (error) {
    console.error('Error generating admin token:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();