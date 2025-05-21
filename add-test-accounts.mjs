import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { promisify } from 'util';

// Set up Supabase client using environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function main() {
  try {
    console.log('Creating test accounts in Supabase...');
    
    // Admin account details
    const adminEmail = 'admin@test.com';
    const adminPassword = await hashPassword('adminpass123');
    const adminName = 'Test Admin';
    
    // Check if admin exists
    const { data: adminExists } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', adminEmail)
      .maybeSingle();
    
    if (adminExists) {
      console.log(`Admin account already exists: ${adminExists.email}`);
    } else {
      // Create admin account
      const { data: newAdmin, error: adminError } = await supabase
        .from('users')
        .insert([{
          email: adminEmail,
          password: adminPassword,
          name: adminName,
          role: 'admin',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (adminError) {
        console.error('Error creating admin account:', adminError);
      } else {
        console.log(`Admin account created: ${newAdmin.email}`);
      }
    }
    
    // Consignor account details
    const consignorEmail = 'consignor@test.com';
    const consignorPassword = await hashPassword('testpass123');
    const consignorName = 'Test Consignor';
    
    // Check if consignor exists
    const { data: consignorExists } = await supabase
      .from('customers')
      .select('id, email')
      .eq('email', consignorEmail)
      .maybeSingle();
    
    if (consignorExists) {
      console.log(`Consignor account already exists: ${consignorExists.email}`);
    } else {
      // Create consignor account
      const { data: newConsignor, error: consignorError } = await supabase
        .from('customers')
        .insert([{
          email: consignorEmail,
          password: consignorPassword,
          name: consignorName,
          role: 'consignor',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (consignorError) {
        console.error('Error creating consignor account:', consignorError);
      } else {
        console.log(`Consignor account created: ${newConsignor.email}`);
      }
    }
    
    console.log('\nTest accounts ready to use:');
    console.log('Admin: admin@test.com / adminpass123');
    console.log('Consignor: consignor@test.com / testpass123');
    
  } catch (error) {
    console.error('Error during account creation:', error);
  }
}

main();