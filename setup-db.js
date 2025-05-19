// Direct Supabase database setup
// This script creates all the necessary tables directly in the Supabase database

import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

const { Pool } = pg;

// The database connection string (from .env)
const CONNECTION_STRING = process.env.DATABASE_URL;

console.log(`Setting up database with connection string: ${CONNECTION_STRING.substring(0, 50)}...`);

// Configure database connection
const pool = new Pool({
  connectionString: CONNECTION_STRING,
  ssl: {
    rejectUnauthorized: false
  },
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Hash for test passwords (admin123)
const TEST_PASSWORD_HASH = 'be86df160d734b4d30c88b12be96a5a1eb2b5f9286081844afddc47fe0f4d39c.3e17e2bd5a2d5b0a8c69a1c758fb9d5a';

// Execute a database query with error handling
async function executeQuery(query, params = []) {
  const client = await pool.connect();
  try {
    console.log(`Executing query: ${query.substring(0, 60)}...`);
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

// Main database setup function
async function setupDatabase() {
  try {
    console.log('Testing database connection...');
    const result = await executeQuery('SELECT NOW() as time');
    console.log('Database connection successful!', result.rows[0]);
    
    // Create admin_users table
    if (!(await tableExists('admin_users'))) {
      console.log('Creating admin_users table...');
      await executeQuery(`
        CREATE TABLE admin_users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'admin',
          provider VARCHAR(50) NOT NULL DEFAULT 'local',
          last_login TIMESTAMP NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          external_id VARCHAR(255) NULL,
          profile_image_url TEXT NULL
        )
      `);
      console.log('admin_users table created successfully');
    } else {
      console.log('admin_users table already exists');
    }
    
    // Create users table
    if (!(await tableExists('users'))) {
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
      console.log('users table created successfully');
    } else {
      console.log('users table already exists');
    }
    
    // Create customers table
    if (!(await tableExists('customers'))) {
      console.log('Creating customers table...');
      await executeQuery(`
        CREATE TABLE customers (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NULL,
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
      console.log('customers table created successfully');
    } else {
      console.log('customers table already exists');
    }
    
    // Create items table
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
      console.log('items table created successfully');
    } else {
      console.log('items table already exists');
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
      console.log('analysis table created successfully');
    } else {
      console.log('analysis table already exists');
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
      console.log('pricing table created successfully');
    } else {
      console.log('pricing table already exists');
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
      console.log('shipping table created successfully');
    } else {
      console.log('shipping table already exists');
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
      console.log('orders table created successfully');
    } else {
      console.log('orders table already exists');
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
      console.log('order_items table created successfully');
    } else {
      console.log('order_items table already exists');
    }
    
    // Create ML training examples table
    if (!(await tableExists('ml_training_examples'))) {
      console.log('Creating ml_training_examples table...');
      await executeQuery(`
        CREATE TABLE ml_training_examples (
          id SERIAL PRIMARY KEY,
          product_type VARCHAR(100) NOT NULL,
          brand VARCHAR(100) NULL,
          description TEXT NULL,
          image_url TEXT NULL,
          features JSONB NULL,
          price_range JSONB NULL,
          market_data JSONB NULL,
          verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NULL
        )
      `);
      console.log('ml_training_examples table created successfully');
    } else {
      console.log('ml_training_examples table already exists');
    }
    
    // Create ML model configs table
    if (!(await tableExists('ml_model_configs'))) {
      console.log('Creating ml_model_configs table...');
      await executeQuery(`
        CREATE TABLE ml_model_configs (
          id SERIAL PRIMARY KEY,
          model_id VARCHAR(100) UNIQUE NOT NULL,
          model_name VARCHAR(100) NOT NULL,
          model_type VARCHAR(50) NOT NULL,
          parameters JSONB NULL,
          active BOOLEAN DEFAULT FALSE,
          version VARCHAR(20) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NULL,
          last_training_date TIMESTAMP NULL
        )
      `);
      console.log('ml_model_configs table created successfully');
    } else {
      console.log('ml_model_configs table already exists');
    }
    
    // Create ML training sessions table
    if (!(await tableExists('ml_training_sessions'))) {
      console.log('Creating ml_training_sessions table...');
      await executeQuery(`
        CREATE TABLE ml_training_sessions (
          id SERIAL PRIMARY KEY,
          model_config_id INTEGER NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          start_time TIMESTAMP NOT NULL DEFAULT NOW(),
          end_time TIMESTAMP NULL,
          metrics JSONB NULL,
          logs TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NULL
        )
      `);
      console.log('ml_training_sessions table created successfully');
    } else {
      console.log('ml_training_sessions table already exists');
    }

    // Add foreign key constraints if needed
    // (skipping for now to keep things simple)
    
    // Create session table for express-session
    if (!(await tableExists('session'))) {
      console.log('Creating session table...');
      await executeQuery(`
        CREATE TABLE session (
          sid VARCHAR(255) NOT NULL PRIMARY KEY,
          sess JSON NOT NULL,
          expire TIMESTAMP(6) NOT NULL
        )
      `);
      console.log('session table created successfully');
      
      // Create index on expire column
      await executeQuery(`
        CREATE INDEX IDX_session_expire ON session (expire)
      `);
      console.log('session expiry index created successfully');
    } else {
      console.log('session table already exists');
    }
    
    // Create test admin user
    await createTestAdminUser();
    
    // Create test consignor user
    await createTestConsignorUser();
    
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
    // Check if admin user already exists
    const adminCheck = await executeQuery(
      "SELECT id FROM admin_users WHERE email = 'admin@dutchthrift.com'"
    );
    
    if (adminCheck.rows.length === 0) {
      console.log('Creating test admin user...');
      await executeQuery(
        `INSERT INTO admin_users (email, password, name, role) 
         VALUES ($1, $2, $3, $4)`,
        ['admin@dutchthrift.com', TEST_PASSWORD_HASH, 'Admin User', 'admin']
      );
      console.log('Test admin user created successfully!');
    } else {
      console.log('Admin user already exists, skipping creation');
    }
  } catch (error) {
    console.error('Failed to create test admin user:', error);
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

// Run the setup
setupDatabase().catch(console.error);