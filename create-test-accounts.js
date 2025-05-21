/**
 * This script creates test admin and consignor accounts with known credentials
 */
import { Pool } from '@neondatabase/serverless';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Password utilities
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function main() {
  // Database setup
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Connected to database');
    
    // Create test admin user
    const adminPassword = await hashPassword('adminpass123');
    const adminQuery = `
      INSERT INTO users (email, password, name, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET password = $2, name = $3, role = $4
      RETURNING id, email, name, role;
    `;
    const adminResult = await pool.query(adminQuery, [
      'admin@test.com',
      adminPassword,
      'Test Admin',
      'admin'
    ]);
    
    console.log('Created/updated admin user:', adminResult.rows[0]);
    
    // Create test consignor
    const consignorPassword = await hashPassword('testpass123');
    const consignorQuery = `
      INSERT INTO customers (email, password, name, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET password = $2, name = $3, role = $4
      RETURNING id, email, name, role;
    `;
    const consignorResult = await pool.query(consignorQuery, [
      'consignor@test.com',
      consignorPassword,
      'Test Consignor',
      'consignor'
    ]);
    
    console.log('Created/updated consignor user:', consignorResult.rows[0]);
    
    console.log('\nTest accounts created with these credentials:');
    console.log('Admin login:');
    console.log('Email: admin@test.com');
    console.log('Password: adminpass123');
    console.log('\nConsignor login:');
    console.log('Email: consignor@test.com');
    console.log('Password: testpass123');
    
  } catch (error) {
    console.error('Error creating test accounts:', error);
  } finally {
    await pool.end();
  }
}

main();