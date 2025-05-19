import { Pool } from 'pg';

// Direct Supabase connection string
const SUPABASE_DB_URL = "postgresql://postgres.pkktakjpjytfxkkyuvrk:Prinsesseweg79!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";

console.log(`Connecting to Supabase database: ${SUPABASE_DB_URL.replace(/:[^:]*@/, ':****@')}`);

// Create a connection pool
const pool = new Pool({
  connectionString: SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 10000
});

async function main() {
  const client = await pool.connect();
  try {
    // Check if customer exists
    console.log("Checking customer and user accounts...");
    
    const customersResult = await client.query(`
      SELECT * FROM customers WHERE email = $1
    `, ['theooenema@hotmail.com']);
    
    const usersResult = await client.query(`
      SELECT * FROM users WHERE email = $1
    `, ['theooenema@hotmail.com']);
    
    console.log(`Found ${customersResult.rows.length} customers with email theooenema@hotmail.com`);
    console.log(`Found ${usersResult.rows.length} users with email theooenema@hotmail.com`);
    
    // If customer doesn't exist, create it
    if (customersResult.rows.length === 0) {
      console.log("Creating customer account for theooenema@hotmail.com");
      
      await client.query(`
        INSERT INTO customers (
          name, email, password, phone, address, city, state, postal_code, country, role, created_at
        ) VALUES (
          'Theo Oenema', 'theooenema@hotmail.com', 'password123', '0612345678', 
          'Prinsesseweg 79', 'Groningen', 'Groningen', '9717 KS', 'Netherlands', 'consignor', NOW()
        )
      `);
      
      console.log("Customer account created");
    } else {
      console.log("Customer account exists, updating password");
      
      // Update password to plain text for consistency with what we did in auth-fix.js
      await client.query(`
        UPDATE customers SET password = $1 WHERE email = $2
      `, ['password123', 'theooenema@hotmail.com']);
      
      console.log("Customer password updated");
    }
    
    // Check if user exists, if not create it
    if (usersResult.rows.length === 0) {
      console.log("Creating user account for theooenema@hotmail.com");
      
      await client.query(`
        INSERT INTO users (
          name, email, password, role, provider, created_at
        ) VALUES (
          'Theo Oenema', 'theooenema@hotmail.com', 'password123', 'consignor', 'local', NOW()
        )
      `);
      
      console.log("User account created");
    } else {
      console.log("User account exists, updating password");
      
      // Update password to plain text for consistency
      await client.query(`
        UPDATE users SET password = $1 WHERE email = $2
      `, ['password123', 'theooenema@hotmail.com']);
      
      console.log("User password updated");
    }
    
    // Now link the user to the customer if needed
    const userIdResult = await client.query(`
      SELECT id FROM users WHERE email = $1
    `, ['theooenema@hotmail.com']);
    
    const customerIdResult = await client.query(`
      SELECT id FROM customers WHERE email = $1
    `, ['theooenema@hotmail.com']);
    
    if (userIdResult.rows.length > 0 && customerIdResult.rows.length > 0) {
      const userId = userIdResult.rows[0].id;
      const customerId = customerIdResult.rows[0].id;
      
      // Check if the users table has a customer_id column
      const columnsResult = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'customer_id'
      `);
      
      if (columnsResult.rows.length > 0) {
        console.log("Linking user and customer accounts");
        
        await client.query(`
          UPDATE users SET customer_id = $1 WHERE id = $2
        `, [customerId, userId]);
        
        console.log("User and customer accounts linked");
      } else {
        console.log("No customer_id column in users table, skipping linkage");
      }
    }
    
    console.log("Consignor login has been fixed successfully!");
    
  } catch (error) {
    console.error('Error fixing consignor login:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();