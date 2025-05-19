// Direct Supabase schema setup with ES modules
import pg from 'pg';
import dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

const { Pool } = pg;

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
    
    // Create orders table
    if (!(await tableExists('orders'))) {
      console.log('Creating orders table...');
      await executeQuery(`
        CREATE TABLE orders (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL,
          order_number VARCHAR(50) UNIQUE NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NULL,
          tracking_code VARCHAR(100) NULL,
          shipping_address TEXT NULL,
          shipping_method VARCHAR(50) NULL,
          total_value NUMERIC(10,2) NULL,
          total_payout NUMERIC(10,2) NULL,
          payment_method VARCHAR(50) NULL,
          payment_status VARCHAR(50) NULL,
          notes TEXT NULL
        )
      `);
    }
    
    // Create order_items table
    if (!(await tableExists('order_items'))) {
      console.log('Creating order_items table...');
      await executeQuery(`
        CREATE TABLE order_items (
          id SERIAL PRIMARY KEY,
          order_id INTEGER NOT NULL,
          item_id INTEGER NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(order_id, item_id)
        )
      `);
    }
    
    // Create pricing table
    if (!(await tableExists('pricing'))) {
      console.log('Creating pricing table...');
      await executeQuery(`
        CREATE TABLE pricing (
          id SERIAL PRIMARY KEY,
          item_id INTEGER NOT NULL,
          average_market_price NUMERIC(10,2) NULL,
          suggested_listing_price NUMERIC(10,2) NULL,
          commission_rate NUMERIC(5,2) NULL,
          suggested_payout NUMERIC(10,2) NULL,
          final_sale_price NUMERIC(10,2) NULL,
          final_payout NUMERIC(10,2) NULL,
          payout_type VARCHAR(50) NULL,
          store_credit BOOLEAN DEFAULT FALSE,
          accepted_by_customer BOOLEAN DEFAULT FALSE,
          store_credit_amount NUMERIC(10,2) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NULL,
          UNIQUE(item_id)
        )
      `);
    }
    
    // Create analysis table
    if (!(await tableExists('analysis'))) {
      console.log('Creating analysis table...');
      await executeQuery(`
        CREATE TABLE analysis (
          id SERIAL PRIMARY KEY,
          item_id INTEGER NOT NULL,
          brand VARCHAR(100) NULL,
          category VARCHAR(100) NULL,
          product_type VARCHAR(100) NULL,
          model VARCHAR(100) NULL,
          condition VARCHAR(50) NULL,
          color VARCHAR(50) NULL,
          material VARCHAR(100) NULL,
          features JSONB NULL,
          size VARCHAR(50) NULL,
          dimensions VARCHAR(100) NULL,
          weight VARCHAR(50) NULL,
          authenticity VARCHAR(50) NULL,
          materials_composition TEXT NULL,
          measurements TEXT NULL,
          notes TEXT NULL,
          confidence_score VARCHAR(50) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NULL,
          UNIQUE(item_id)
        )
      `);
    }
    
    // Create shipping table
    if (!(await tableExists('shipping'))) {
      console.log('Creating shipping table...');
      await executeQuery(`
        CREATE TABLE shipping (
          id SERIAL PRIMARY KEY,
          item_id INTEGER NOT NULL,
          tracking_number VARCHAR(100) NULL,
          carrier VARCHAR(50) NULL,
          label_url TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(item_id)
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