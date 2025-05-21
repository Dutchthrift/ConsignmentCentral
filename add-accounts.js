import { createClient } from '@supabase/supabase-js';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

// Set up Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function addAdminAccount() {
  try {
    const adminEmail = 'admin@test.com';
    const adminPassword = await hashPassword('adminpass123');
    const adminName = 'Test Admin';
    
    // Check if admin account already exists
    const { data: existingAdmin } = await supabase
      .from('users')
      .select()
      .eq('email', adminEmail)
      .single();
    
    if (existingAdmin) {
      console.log('Admin account already exists:', existingAdmin.email);
      return existingAdmin;
    }
    
    // Create the admin account
    const { data: newAdmin, error } = await supabase
      .from('users')
      .insert({
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role: 'admin'
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    console.log('Created admin account successfully:', newAdmin.email);
    return newAdmin;
  } catch (error) {
    console.error('Error creating admin account:', error);
    throw error;
  }
}

async function addConsignorAccount() {
  try {
    const consignorEmail = 'consignor@test.com';
    const consignorPassword = await hashPassword('testpass123');
    const consignorName = 'Test Consignor';
    
    // Check if consignor account already exists
    const { data: existingConsignor } = await supabase
      .from('customers')
      .select()
      .eq('email', consignorEmail)
      .single();
    
    if (existingConsignor) {
      console.log('Consignor account already exists:', existingConsignor.email);
      return existingConsignor;
    }
    
    // Create the consignor account
    const { data: newConsignor, error } = await supabase
      .from('customers')
      .insert({
        email: consignorEmail,
        password: consignorPassword,
        name: consignorName,
        role: 'consignor'
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    console.log('Created consignor account successfully:', newConsignor.email);
    return newConsignor;
  } catch (error) {
    console.error('Error creating consignor account:', error);
    throw error;
  }
}

// Run the account creation
async function main() {
  try {
    console.log('Creating test accounts in Supabase...');
    
    await addAdminAccount();
    await addConsignorAccount();
    
    console.log('Account creation complete!');
    console.log('You can now login with:');
    console.log('Admin: admin@test.com / adminpass123');
    console.log('Consignor: consignor@test.com / testpass123');
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

main();