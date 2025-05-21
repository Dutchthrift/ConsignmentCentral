// CommonJS script to add test users to the database
require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');
const crypto = require('crypto');
const util = require('util');

const scryptAsync = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function main() {
  console.log('Creating test accounts...');
  
  // Connect to the database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Create admin account
    const adminEmail = 'admin@test.com';
    const adminPassword = await hashPassword('adminpass123');
    const adminName = 'Test Admin';
    
    console.log('Creating admin account...');
    
    // Check if admin already exists
    const adminCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [adminEmail]
    );
    
    if (adminCheck.rows.length === 0) {
      // Insert admin
      await pool.query(
        'INSERT INTO users (email, password, name, role, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [adminEmail, adminPassword, adminName, 'admin']
      );
      console.log('Admin account created successfully!');
    } else {
      console.log('Admin account already exists, skipping creation.');
    }
    
    // Create consignor/customer account
    const consignorEmail = 'consignor@test.com';
    const consignorPassword = await hashPassword('testpass123');
    const consignorName = 'Test Consignor';
    
    console.log('Creating consignor account...');
    
    // Check if consignor already exists
    const consignorCheck = await pool.query(
      'SELECT * FROM customers WHERE email = $1',
      [consignorEmail]
    );
    
    if (consignorCheck.rows.length === 0) {
      // Insert consignor
      await pool.query(
        'INSERT INTO customers (email, password, name, role, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [consignorEmail, consignorPassword, consignorName, 'consignor']
      );
      console.log('Consignor account created successfully!');
    } else {
      console.log('Consignor account already exists, skipping creation.');
    }
    
    console.log('Test accounts created successfully!');
    console.log('You can now log in with:');
    console.log('Admin: admin@test.com / adminpass123');
    console.log('Consignor: consignor@test.com / testpass123');
    
  } catch (error) {
    console.error('Error creating test accounts:', error);
  } finally {
    await pool.end();
  }
}

main();