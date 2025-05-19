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

// Password hash for test users
const TEST_PASSWORD_HASH = 'be86df160d734b4d30c88b12be96a5a1eb2b5f9286081844afddc47fe0f4d39c.3e17e2bd5a2d5b0a8c69a1c758fb9d5a';

// Create the users table
async function createUsersTable() {
  const client = await pool.connect();
  try {
    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('Users table already exists. Dropping it to recreate...');
      await client.query('DROP TABLE IF EXISTS users CASCADE');
    }
    
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'consignor',
        provider VARCHAR(50) NOT NULL DEFAULT 'local',
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        customer_id INTEGER NULL REFERENCES customers(id),
        external_id VARCHAR(255) NULL,
        profile_image_url TEXT NULL
      )
    `);
    console.log('Users table created successfully!');
    
    // Create test consignor user
    console.log('Creating test consignor user...');
    
    // First check if the customer exists
    const customerCheck = await client.query(`
      SELECT id FROM customers WHERE email = 'theooenema@hotmail.com'
    `);
    
    let customerId = null;
    if (customerCheck.rows.length > 0) {
      customerId = customerCheck.rows[0].id;
      console.log(`Found existing customer with ID: ${customerId}`);
    } else {
      // Create the customer record
      const newCustomer = await client.query(`
        INSERT INTO customers (email, name, phone, address, city, postal_code, country, role)
        VALUES ('theooenema@hotmail.com', 'Theo Oenema', '+31612345678', 'Prinsesseweg 79', 'Groningen', '9712HM', 'Netherlands', 'customer')
        RETURNING id
      `);
      customerId = newCustomer.rows[0].id;
      console.log(`Created new customer with ID: ${customerId}`);
    }
    
    // Create the user and link to customer
    const newUser = await client.query(`
      INSERT INTO users (email, password, name, role, customer_id)
      VALUES ('theooenema@hotmail.com', $1, 'Theo Oenema', 'consignor', $2)
      RETURNING id
    `, [TEST_PASSWORD_HASH, customerId]);
    
    console.log(`Test consignor user created with ID: ${newUser.rows[0].id}`);
    
    return true;
  } catch (error) {
    console.error('Error creating users table:', error);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function
createUsersTable()
  .then(success => {
    if (success) {
      console.log('Users table setup completed successfully!');
    } else {
      console.error('Failed to set up users table');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });