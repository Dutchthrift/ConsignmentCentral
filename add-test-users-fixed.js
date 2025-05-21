/**
 * This script adds test admin and consignor users to the database with proper schema handling
 * It ensures the user_id relationship between tables is properly handled
 */
import { db } from './server/db.js';
import { users, customers } from './shared/schema.js';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function main() {
  try {
    console.log('Creating test accounts...');
    
    // 1. Create admin user
    console.log('Creating admin user...');
    const hashedAdminPassword = await hashPassword('adminpass123');
    const [admin] = await db
      .insert(users)
      .values({
        email: 'admin@test.com',
        password: hashedAdminPassword,
        name: 'Test Admin',
        role: 'admin',
        created_at: new Date()
      })
      .returning();
    
    console.log('Admin created:', admin);
    
    // 2. Create customer record (will be linked to a consignor user)
    console.log('Creating consignor user...');
    const hashedConsignorPassword = await hashPassword('testpass123');
    
    // First create a user entry for the consignor
    const [consignorUser] = await db
      .insert(users)
      .values({
        email: 'consignor@test.com',
        password: hashedConsignorPassword,
        name: 'Test Consignor',
        role: 'consignor',
        created_at: new Date()
      })
      .returning();
    
    console.log('Consignor user created:', consignorUser);
    
    // Now create the customer record with proper user_id reference
    const [customer] = await db
      .insert(customers)
      .values({
        user_id: consignorUser.id, // Link to the user we just created
        email: 'consignor@test.com',
        password: hashedConsignorPassword,
        name: 'Test Consignor',
        phone: '1234567890',
        address: '123 Test Street',
        city: 'Amsterdam',
        state: 'NH',
        postal_code: '1234AB',
        country: 'NL',
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning();
    
    console.log('Customer record created:', customer);
    
    console.log('Test accounts created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating test accounts:', error);
    process.exit(1);
  }
}

main();