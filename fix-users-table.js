// Script to fix the users table issue
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the database URL from environment variables
const DATABASE_URL = process.env.DATABASE_URL;

console.log(`Connecting to Supabase database: ${DATABASE_URL ? DATABASE_URL.replace(/:[^:]*@/, ':****@') : 'Not set'}`);

// Create a connection pool
const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 1,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

// The hashed password for test users (admin123)
const TEST_PASSWORD_HASH = 'be86df160d734b4d30c88b12be96a5a1eb2b5f9286081844afddc47fe0f4d39c.3e17e2bd5a2d5b0a8c69a1c758fb9d5a';

// Function to execute database queries
async function executeQuery(query, params = []) {
  const client = await pool.connect();
  try {
    console.log(`Executing: ${query.substring(0, 60)}...`);
    const result = await client.query(query, params);
    return result;
  } catch (error) {
    console.error(`Query error: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Check if a table exists
async function tableExists(tableName) {
  try {
    const result = await executeQuery(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
      [tableName]
    );
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

// Function to fix the users table
async function fixUsersTable() {
  try {
    // Check if the users table exists
    const usersExists = await tableExists('users');
    
    if (usersExists) {
      console.log('Found existing users table, dropping it to recreate properly');
      await executeQuery('DROP TABLE IF EXISTS users CASCADE');
    }
    
    // Create the users table
    console.log('Creating users table...');
    await executeQuery(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'consignor',
        provider VARCHAR(50) NOT NULL DEFAULT 'local',
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        customer_id INTEGER NULL,
        external_id VARCHAR(255) NULL,
        profile_image_url TEXT NULL
      )
    `);
    console.log('Users table created successfully');
    
    // Create test consignor user
    await createTestConsignorUser();
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error fixing users table:', error);
  } finally {
    await pool.end();
  }
}

// Create a test consignor user
async function createTestConsignorUser() {
  try {
    // Check if consignor user already exists
    const userCheck = await executeQuery(
      "SELECT id FROM users WHERE email = 'theooenema@hotmail.com'"
    );
    
    if (userCheck.rows.length === 0) {
      console.log('Creating test consignor user...');
      
      // Create user
      const userResult = await executeQuery(
        `INSERT INTO users (email, password, name, role, provider) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        ['theooenema@hotmail.com', TEST_PASSWORD_HASH, 'Theo Oenema', 'consignor', 'local']
      );
      
      const userId = userResult.rows[0].id;
      
      // Check if customer already exists
      const customerCheck = await executeQuery(
        "SELECT id FROM customers WHERE email = 'theooenema@hotmail.com'"
      );
      
      if (customerCheck.rows.length === 0) {
        // Create customer
        const customerResult = await executeQuery(
          `INSERT INTO customers (email, name, phone, address, city, postal_code, country, role) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [
            'theooenema@hotmail.com', 
            'Theo Oenema', 
            '+31612345678', 
            'Prinsesseweg 79', 
            'Groningen', 
            '9712HM', 
            'Netherlands', 
            'customer'
          ]
        );
        
        const customerId = customerResult.rows[0].id;
        
        // Link user to customer
        await executeQuery(
          `UPDATE users SET customer_id = $1 WHERE id = $2`,
          [customerId, userId]
        );
        
        console.log('Test consignor user and customer created and linked successfully!');
      } else {
        const customerId = customerCheck.rows[0].id;
        
        // Link user to existing customer
        await executeQuery(
          `UPDATE users SET customer_id = $1 WHERE id = $2`,
          [customerId, userId]
        );
        
        console.log('Test consignor user created and linked to existing customer!');
      }
    } else {
      console.log('Consignor user already exists, skipping creation');
    }
  } catch (error) {
    console.error('Failed to create test consignor user:', error);
  }
}

// Run the function
fixUsersTable().catch(console.error);