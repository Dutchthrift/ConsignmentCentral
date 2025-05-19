// Direct Supabase schema setup without external dependencies
const { Pool } = require('pg');
require('dotenv').config();

// Use the direct Supabase connection string
const CONNECTION_STRING = process.env.DATABASE_URL || 
  'postgresql://postgres.pkktakjpjytfxkkyuvrk:Prinsesseweg79!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

console.log('Connecting to Supabase with direct pooler connection...');

// Configure the connection pool
const pool = new Pool({
  connectionString: CONNECTION_STRING,
  ssl: {
    rejectUnauthorized: false
  },
  max: 1, // Use minimal connections for setup
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Function to execute queries with error handling
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
    console.error(`Failed to check if table ${tableName} exists:`, error);
    return false;
  }
}

// Create tables if they don't exist
async function setupDatabase() {
  try {
    console.log('Testing database connection...');
    const result = await executeQuery('SELECT NOW() as time');
    console.log('Connection successful!', result.rows[0]);
    
    // Create tables only if they don't exist
    if (!(await tableExists('admin_users'))) {
      console.log('Creating admin_users table...');
      await executeQuery(`
        CREATE TABLE admin_users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'admin',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          provider VARCHAR(50) NOT NULL DEFAULT 'local',
          last_login TIMESTAMP NULL
        )
      `);
    }
    
    if (!(await tableExists('users'))) {
      console.log('Creating users table...');
      await executeQuery(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'consignor',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          provider VARCHAR(50) NOT NULL DEFAULT 'local',
          last_login TIMESTAMP NULL,
          customer_id INTEGER NULL
        )
      `);
    }
    
    if (!(await tableExists('customers'))) {
      console.log('Creating customers table...');
      await executeQuery(`
        CREATE TABLE customers (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(50) NULL,
          address VARCHAR(255) NULL,
          city VARCHAR(100) NULL,
          state VARCHAR(100) NULL,
          postal_code VARCHAR(20) NULL,
          country VARCHAR(100) NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'customer',
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
    }
    
    if (!(await tableExists('items'))) {
      console.log('Creating items table...');
      await executeQuery(`
        CREATE TABLE items (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL,
          reference_id VARCHAR(50) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          brand VARCHAR(100) NULL,
          description TEXT NULL,
          category VARCHAR(100) NULL,
          condition VARCHAR(50) NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          image_urls TEXT[] NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NULL
        )
      `);
    }

    // Create a test admin user
    await createTestAdminUser();
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Database setup failed:', error);
  } finally {
    await pool.end();
  }
}

// Create a test admin user
async function createTestAdminUser() {
  try {
    // First check if admin user already exists
    const adminCheck = await executeQuery(
      "SELECT id FROM admin_users WHERE email = 'admin@dutchthrift.com'"
    );
    
    if (adminCheck.rows.length === 0) {
      // Hash password (simplified for this example)
      const hashedPassword = 'be86df160d734b4d30c88b12be96a5a1eb2b5f9286081844afddc47fe0f4d39c.3e17e2bd5a2d5b0a8c69a1c758fb9d5a'; // admin123
      
      console.log('Creating test admin user...');
      await executeQuery(
        `INSERT INTO admin_users (email, password, name, role) 
         VALUES ('admin@dutchthrift.com', $1, 'Admin User', 'admin')`,
        [hashedPassword]
      );
      console.log('Test admin user created successfully!');
    } else {
      console.log('Admin user already exists, skipping creation.');
    }
  } catch (error) {
    console.error('Failed to create test admin user:', error);
  }
}

// Run the setup
setupDatabase().catch(console.error);