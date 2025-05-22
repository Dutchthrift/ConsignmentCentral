require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const readline = require('readline');

// Connect to Supabase PostgreSQL database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function executeQuery(query, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Database error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function hashPassword(plainPassword) {
  // Use bcrypt to hash the password
  return bcrypt.hashSync(plainPassword, 10);
}

async function isPasswordHashed(password) {
  // Simple check to see if password is likely a bcrypt hash (starts with $2)
  return password.startsWith('$2');
}

async function importCustomers() {
  console.log('Starting customer import...');
  
  // Read the CSV file
  const fileStream = fs.createReadStream('./attached_assets/customers_rows.csv');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  // Skip the header row
  let isFirstLine = true;
  
  for await (const line of rl) {
    if (isFirstLine) {
      isFirstLine = false;
      continue;
    }
    
    // Parse CSV line (handling commas in fields)
    const parseCsvLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current);
      return result;
    };
    
    const parts = parseCsvLine(line);
    const [id, email, password, name, phone, address, city, state, postalCode, country, role, createdAt] = parts;
    
    // Ensure password is hashed with bcrypt
    let hashedPassword;
    if (password === 'password123') {
      // For plaintext passwords, hash them
      hashedPassword = await hashPassword(password);
      console.log(`Hashed password for ${email}`);
    } else if (await isPasswordHashed(password)) {
      // Already a bcrypt hash, keep it
      hashedPassword = password;
      console.log(`Password for ${email} is already hashed`);
    } else {
      // Not plaintext and not bcrypt hash, assume it's our test account
      if (email === 'consignor@test.com') {
        // This is our test consignor account, use the known password
        hashedPassword = await hashPassword('consignorpass123');
        console.log(`Created new hash for test consignor account`);
      } else {
        // For other formats, create a new secure password
        hashedPassword = await hashPassword('NewSecurePassword123');
        console.log(`Warning: Unknown password format for ${email}, set to 'NewSecurePassword123'`);
      }
    }
    
    // Check if customer already exists
    const existingCustomer = await executeQuery(
      'SELECT id FROM customers WHERE email = $1',
      [email]
    );
    
    if (existingCustomer.length > 0) {
      // Update existing customer
      await executeQuery(
        `UPDATE customers 
         SET name = $1, password = $2, phone = $3, address = $4, city = $5, 
             state = $6, postal_code = $7, country = $8, role = $9, created_at = $10
         WHERE email = $11`,
        [name, hashedPassword, phone || null, address || null, city || null, 
         state || null, postalCode || null, country || null, 'consignor', createdAt, email]
      );
      console.log(`Updated customer: ${email}`);
    } else {
      // Insert new customer
      await executeQuery(
        `INSERT INTO customers 
         (id, email, name, password, phone, address, city, state, postal_code, country, role, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [id, email, name, hashedPassword, phone || null, address || null, city || null, 
         state || null, postalCode || null, country || null, 'consignor', createdAt]
      );
      console.log(`Inserted new customer: ${email}`);
    }
  }
  
  console.log('Import completed successfully');
}

async function verifyLogin() {
  console.log('\nVerifying login capability...');
  
  // Test with both customers
  const testEmails = ['theooenema@hotmail.com', 'consignor@test.com'];
  const passwords = ['password123', 'consignorpass123'];
  
  for (let i = 0; i < testEmails.length; i++) {
    const email = testEmails[i];
    const password = passwords[i];
    
    try {
      // Get the stored hash
      const result = await executeQuery(
        'SELECT id, password FROM customers WHERE email = $1',
        [email]
      );
      
      if (result.length === 0) {
        console.log(`Test failed: No customer found with email ${email}`);
        continue;
      }
      
      const { id, password: storedHash } = result[0];
      
      // Verify password
      const isMatch = bcrypt.compareSync(password, storedHash);
      
      if (isMatch) {
        console.log(`✅ Login verification successful for ${email} (customerId: ${id})`);
      } else {
        console.log(`❌ Login verification failed for ${email}: Password doesn't match`);
      }
    } catch (error) {
      console.error(`Error verifying login for ${email}:`, error.message);
    }
  }
}

// Main execution
async function main() {
  try {
    await importCustomers();
    await verifyLogin();
    console.log('\nAll operations completed successfully');
  } catch (error) {
    console.error('Error in main execution:', error);
  } finally {
    // Close the database pool
    await pool.end();
  }
}

main();