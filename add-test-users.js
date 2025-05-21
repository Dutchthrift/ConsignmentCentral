/**
 * This script adds test admin and consignor users to the database with proper password hashing
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
    
    // Get the next available ID for each table
    const adminIdQuery = 'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM users';
    const adminIdResult = await pool.query(adminIdQuery);
    const adminId = adminIdResult.rows[0].next_id;
    
    const consignorIdQuery = 'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM customers';
    const consignorIdResult = await pool.query(consignorIdQuery);
    const consignorId = consignorIdResult.rows[0].next_id;
    
    // Create test admin user with the correct fields
    const adminPassword = await hashPassword('adminpass123');
    const adminEmail = 'admin@test.com';
    const adminName = 'Test Admin';
    
    // Check if admin user already exists
    const checkAdminQuery = 'SELECT id FROM users WHERE email = $1';
    const adminExists = await pool.query(checkAdminQuery, [adminEmail]);
    
    if (adminExists.rows.length > 0) {
      // Update existing admin
      const updateAdminQuery = `
        UPDATE users 
        SET password = $1, name = $2, role = $3
        WHERE email = $4
        RETURNING id, email, name, role
      `;
      const adminResult = await pool.query(updateAdminQuery, [
        adminPassword,
        adminName,
        'admin',
        adminEmail
      ]);
      console.log('Updated admin user:', adminResult.rows[0]);
    } else {
      // Create new admin
      const createAdminQuery = `
        INSERT INTO users (id, email, password, name, role, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, name, role
      `;
      const adminResult = await pool.query(createAdminQuery, [
        adminId,
        adminEmail,
        adminPassword,
        adminName,
        'admin',
        new Date()
      ]);
      console.log('Created admin user:', adminResult.rows[0]);
    }
    
    // Create test consignor with the correct fields
    const consignorPassword = await hashPassword('testpass123');
    const consignorEmail = 'consignor@test.com';
    const consignorName = 'Test Consignor';
    
    // Check if consignor already exists
    const checkConsignorQuery = 'SELECT id FROM customers WHERE email = $1';
    const consignorExists = await pool.query(checkConsignorQuery, [consignorEmail]);
    
    if (consignorExists.rows.length > 0) {
      // Update existing consignor
      const updateConsignorQuery = `
        UPDATE customers
        SET password = $1, name = $2, role = $3
        WHERE email = $4
        RETURNING id, email, name, role
      `;
      const consignorResult = await pool.query(updateConsignorQuery, [
        consignorPassword,
        consignorName,
        'consignor',
        consignorEmail
      ]);
      console.log('Updated consignor user:', consignorResult.rows[0]);
    } else {
      // Create new consignor
      const createConsignorQuery = `
        INSERT INTO customers (id, email, password, name, role, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, name, role
      `;
      const consignorResult = await pool.query(createConsignorQuery, [
        consignorId,
        consignorEmail,
        consignorPassword,
        consignorName,
        'consignor',
        new Date()
      ]);
      console.log('Created consignor user:', consignorResult.rows[0]);
    }
    
    console.log('\nTest accounts prepared with these credentials:');
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