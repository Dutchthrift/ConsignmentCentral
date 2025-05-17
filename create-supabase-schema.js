// Create Supabase Schema Script
// This script connects to Supabase and creates the necessary tables
// based on the application's schema structure

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Initialize environment variables
dotenv.config();

const { Pool } = pg;

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if DATABASE_URL is defined
if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL environment variable is not defined");
  console.log("Please add your Supabase connection string to the .env file");
  console.log("Example: DATABASE_URL=\"postgresql://postgres.user:password@aws-0-region.pooler.supabase.com:6543/postgres\"");
  process.exit(1);
}

// Set up database connection with SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase
  },
  max: 3, // Limit connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000
});

// Connection status flag
let connected = false;

// Utility function for executing queries with retry
async function executeQuery(query, params = [], retries = 3) {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        console.log(`Executing query: ${query.split('\n')[0]}...`);
        const result = await client.query(query, params);
        return result;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`Query attempt ${attempt + 1}/${retries} failed:`, error.message);
      lastError = error;
      
      // Wait before retrying (exponential backoff)
      if (attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed after ${retries} attempts. Last error: ${lastError.message}`);
}

// Function to check if a table exists
async function tableExists(tableName) {
  try {
    const result = await executeQuery(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)",
      [tableName]
    );
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error.message);
    return false;
  }
}

// Test the database connection
async function testConnection() {
  try {
    await executeQuery("SELECT 1");
    console.log("✅ Successfully connected to Supabase database");
    connected = true;
    return true;
  } catch (error) {
    console.error("❌ Failed to connect to database:", error.message);
    return false;
  }
}

// Create the admin users table
async function createAdminUsersTable() {
  if (await tableExists("admin_users")) {
    console.log("Table 'admin_users' already exists, skipping creation");
    return;
  }

  try {
    await executeQuery(`
      CREATE TABLE admin_users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        provider TEXT NOT NULL DEFAULT 'local',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log("✅ Created admin_users table");
  } catch (error) {
    console.error("❌ Failed to create admin_users table:", error.message);
    throw error;
  }
}

// Create the users table (for consignors)
async function createUsersTable() {
  if (await tableExists("users")) {
    console.log("Table 'users' already exists, skipping creation");
    return;
  }

  try {
    await executeQuery(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'consignor',
        provider TEXT NOT NULL DEFAULT 'local',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log("✅ Created users table");
  } catch (error) {
    console.error("❌ Failed to create users table:", error.message);
    throw error;
  }
}

// Create the customers table (consignors)
async function createCustomersTable() {
  if (await tableExists("customers")) {
    console.log("Table 'customers' already exists, skipping creation");
    return;
  }

  try {
    await executeQuery(`
      CREATE TABLE customers (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        city TEXT,
        postal_code TEXT, 
        country TEXT,
        payout_method TEXT,
        iban TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Created customers table");
  } catch (error) {
    console.error("❌ Failed to create customers table:", error.message);
    throw error;
  }
}

// Create the items table
async function createItemsTable() {
  if (await tableExists("items")) {
    console.log("Table 'items' already exists, skipping creation");
    return;
  }

  try {
    await executeQuery(`
      CREATE TABLE items (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        reference_id TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        brand TEXT,
        category TEXT,
        condition TEXT,
        size TEXT,
        color TEXT,
        materials TEXT,
        status TEXT NOT NULL DEFAULT 'Submitted',
        image_urls TEXT[],
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Created items table");
  } catch (error) {
    console.error("❌ Failed to create items table:", error.message);
    throw error;
  }
}

// Create the analysis table
async function createAnalysisTable() {
  if (await tableExists("analysis")) {
    console.log("Table 'analysis' already exists, skipping creation");
    return;
  }

  try {
    await executeQuery(`
      CREATE TABLE analysis (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL REFERENCES items(id),
        authenticity_score NUMERIC,
        condition_score NUMERIC,
        market_demand_score NUMERIC,
        style_analysis TEXT,
        material_analysis TEXT,
        brand_analysis TEXT,
        ai_detection_results JSONB,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Created analysis table");
  } catch (error) {
    console.error("❌ Failed to create analysis table:", error.message);
    throw error;
  }
}

// Create the pricing table
async function createPricingTable() {
  if (await tableExists("pricing")) {
    console.log("Table 'pricing' already exists, skipping creation");
    return;
  }

  try {
    await executeQuery(`
      CREATE TABLE pricing (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL REFERENCES items(id),
        suggested_price NUMERIC NOT NULL,
        actual_price NUMERIC NOT NULL,
        commission_rate NUMERIC NOT NULL,
        payout_amount NUMERIC NOT NULL,
        currency_code TEXT NOT NULL DEFAULT 'EUR',
        accepted_by_customer BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Created pricing table");
  } catch (error) {
    console.error("❌ Failed to create pricing table:", error.message);
    throw error;
  }
}

// Create the shipping table
async function createShippingTable() {
  if (await tableExists("shipping")) {
    console.log("Table 'shipping' already exists, skipping creation");
    return;
  }

  try {
    await executeQuery(`
      CREATE TABLE shipping (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL REFERENCES items(id),
        label_url TEXT,
        tracking_code TEXT,
        carrier TEXT,
        shipping_method TEXT,
        weight NUMERIC,
        dimensions TEXT,
        shipping_cost NUMERIC,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Created shipping table");
  } catch (error) {
    console.error("❌ Failed to create shipping table:", error.message);
    throw error;
  }
}

// Create the orders table
async function createOrdersTable() {
  if (await tableExists("orders")) {
    console.log("Table 'orders' already exists, skipping creation");
    return;
  }

  try {
    await executeQuery(`
      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        order_number TEXT NOT NULL UNIQUE,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        status TEXT NOT NULL,
        shipping_address TEXT,
        billing_address TEXT,
        total_amount NUMERIC NOT NULL,
        shipping_cost NUMERIC,
        tracking_code TEXT,
        payment_method TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Created orders table");
  } catch (error) {
    console.error("❌ Failed to create orders table:", error.message);
    throw error;
  }
}

// Create the order_items table
async function createOrderItemsTable() {
  if (await tableExists("order_items")) {
    console.log("Table 'order_items' already exists, skipping creation");
    return;
  }

  try {
    await executeQuery(`
      CREATE TABLE order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id),
        item_id INTEGER NOT NULL REFERENCES items(id),
        price NUMERIC NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Created order_items table");
  } catch (error) {
    console.error("❌ Failed to create order_items table:", error.message);
    throw error;
  }
}

// Create the ml_training_examples table
async function createMlTrainingExamplesTable() {
  if (await tableExists("ml_training_examples")) {
    console.log("Table 'ml_training_examples' already exists, skipping creation");
    return;
  }

  try {
    await executeQuery(`
      CREATE TABLE ml_training_examples (
        id SERIAL PRIMARY KEY,
        item_id INTEGER,
        image_url TEXT,
        image_data BYTEA,
        product_type TEXT NOT NULL,
        brand TEXT,
        model TEXT,
        condition TEXT,
        market_value NUMERIC,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Created ml_training_examples table");
  } catch (error) {
    console.error("❌ Failed to create ml_training_examples table:", error.message);
    throw error;
  }
}

// Create the ml_model_configs table
async function createMlModelConfigsTable() {
  if (await tableExists("ml_model_configs")) {
    console.log("Table 'ml_model_configs' already exists, skipping creation");
    return;
  }

  try {
    await executeQuery(`
      CREATE TABLE ml_model_configs (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        model_id TEXT,
        base_model TEXT NOT NULL,
        training_params JSONB,
        specialization TEXT NOT NULL,
        accuracy NUMERIC,
        is_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Created ml_model_configs table");
  } catch (error) {
    console.error("❌ Failed to create ml_model_configs table:", error.message);
    throw error;
  }
}

// Create the ml_training_sessions table
async function createMlTrainingSessionsTable() {
  if (await tableExists("ml_training_sessions")) {
    console.log("Table 'ml_training_sessions' already exists, skipping creation");
    return;
  }

  try {
    await executeQuery(`
      CREATE TABLE ml_training_sessions (
        id SERIAL PRIMARY KEY,
        model_config_id INTEGER NOT NULL REFERENCES ml_model_configs(id),
        status TEXT NOT NULL,
        examples_count INTEGER,
        epochs INTEGER,
        model_id TEXT,
        accuracy NUMERIC,
        loss NUMERIC,
        training_log TEXT,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log("✅ Created ml_training_sessions table");
  } catch (error) {
    console.error("❌ Failed to create ml_training_sessions table:", error.message);
    throw error;
  }
}

// Main function to create all tables
async function createSchema() {
  try {
    // Test connection first
    const connectionOk = await testConnection();
    if (!connectionOk) {
      console.error("❌ Cannot proceed with schema creation due to connection issues");
      process.exit(1);
    }

    console.log("Creating schema for DutchThrift application...");
    
    // Create tables in order to handle dependencies
    await createAdminUsersTable();
    await createUsersTable();
    await createCustomersTable();
    await createItemsTable();
    await createAnalysisTable();
    await createPricingTable();
    await createShippingTable();
    await createOrdersTable();
    await createOrderItemsTable();
    await createMlTrainingExamplesTable();
    await createMlModelConfigsTable();
    await createMlTrainingSessionsTable();
    
    console.log("\n✅ Supabase schema created successfully.");
    
  } catch (error) {
    console.error("\n❌ Schema creation failed:", error.message);
    process.exit(1);
  } finally {
    // Close connection pool
    await pool.end();
  }
}

// Run the schema creation
createSchema();