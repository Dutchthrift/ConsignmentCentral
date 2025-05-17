// Migration script to move data from in-memory or existing database to Supabase
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Initialize environment variables
dotenv.config();

const { Pool } = pg;

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Retry utility for database operations
async function executeQuery(pool, query, params = [], retries = 3) {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const client = await pool.connect();
      try {
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

async function migrateData() {
  // Supabase connection pool using the pooled connection URL
  const supabasePool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 3, 
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000
  });
  
  // Source data - if we're already using a database, we could connect to it here
  // For now, we'll use hard-coded data similar to what's in our in-memory implementation
  
  try {
    console.log("Starting migration to Supabase");
    
    // Step 1: Create tables if they don't exist
    console.log("Creating tables...");
    
    // Create users table
    await executeQuery(supabasePool, `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'local',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE
      )
    `);
    
    // Create admin_users table
    await executeQuery(supabasePool, `
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'local',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE
      )
    `);
    
    // Create customers table
    await executeQuery(supabasePool, `
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        city TEXT,
        postal_code TEXT,
        country TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create items table
    await executeQuery(supabasePool, `
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        reference_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        brand TEXT,
        category TEXT,
        condition TEXT,
        size TEXT,
        color TEXT,
        materials TEXT,
        status TEXT NOT NULL,
        image_urls TEXT[],
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create analysis table
    await executeQuery(supabasePool, `
      CREATE TABLE IF NOT EXISTS analysis (
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create pricing table
    await executeQuery(supabasePool, `
      CREATE TABLE IF NOT EXISTS pricing (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL REFERENCES items(id),
        suggested_price NUMERIC NOT NULL,
        actual_price NUMERIC NOT NULL,
        commission_rate NUMERIC NOT NULL,
        payout_amount NUMERIC NOT NULL,
        currency_code TEXT NOT NULL DEFAULT 'EUR',
        accepted_by_customer BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create shipping table
    await executeQuery(supabasePool, `
      CREATE TABLE IF NOT EXISTS shipping (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL REFERENCES items(id),
        label_url TEXT,
        tracking_code TEXT,
        carrier TEXT,
        shipping_method TEXT,
        weight NUMERIC,
        dimensions TEXT,
        shipping_cost NUMERIC,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create orders table
    await executeQuery(supabasePool, `
      CREATE TABLE IF NOT EXISTS orders (
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create order_items table
    await executeQuery(supabasePool, `
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id),
        item_id INTEGER NOT NULL REFERENCES items(id),
        price NUMERIC NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Step 2: Migrate admin user(s)
    console.log("Migrating admin users...");
    
    // Admin user - admin@dutchthrift.com / admin123
    await executeQuery(supabasePool, `
      INSERT INTO admin_users (email, password, name, role, provider, created_at) 
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE 
      SET name = EXCLUDED.name, role = EXCLUDED.role
      RETURNING id
    `, [
      'admin@dutchthrift.com', 
      '$2b$10$hVAw5gAzSgCbIUgxYqQlYek5iQeAZxAtXpGSFxK1mHfhrp4YdRzZu', // admin123
      'Admin User',
      'admin',
      'local',
      new Date()
    ]);
    
    // Step 3: Migrate test consignor user
    console.log("Migrating test users and customers...");
    
    // First create the customer
    const customerResult = await executeQuery(supabasePool, `
      INSERT INTO customers (email, name, phone, address, city, postal_code, country, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (email) DO UPDATE 
      SET name = EXCLUDED.name, phone = EXCLUDED.phone
      RETURNING id
    `, [
      'consignor@example.com',
      'Test Consignor',
      '1234567890',
      '123 Test Street',
      'Amsterdam',
      '1000AA',
      'Netherlands',
      new Date(),
      new Date()
    ]);
    
    const customerId = customerResult.rows[0].id;
    
    // Then create the user linked to the customer
    await executeQuery(supabasePool, `
      INSERT INTO users (email, password, name, role, provider, created_at) 
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE 
      SET name = EXCLUDED.name, role = EXCLUDED.role
      RETURNING id
    `, [
      'consignor@example.com',
      '$2b$10$hVAw5gAzSgCbIUgxYqQlYek5iQeAZxAtXpGSFxK1mHfhrp4YdRzZu', // password123
      'Test Consignor',
      'consignor',
      'local',
      new Date()
    ]);
    
    // Step 4: Migrate sample items
    console.log("Migrating sample items and related data...");
    
    // Sample item 1
    const item1Result = await executeQuery(supabasePool, `
      INSERT INTO items (customer_id, reference_id, name, description, brand, category, condition, size, color, materials, status, image_urls, notes, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (reference_id) DO UPDATE 
      SET name = EXCLUDED.name, status = EXCLUDED.status
      RETURNING id
    `, [
      customerId,
      'DT-2023-001',
      'Vintage Levi\'s 501 Jeans',
      'Excellent condition vintage Levi\'s 501 jeans from the 1990s',
      'Levi\'s',
      'Clothing',
      'Excellent',
      '32x34',
      'Blue',
      'Denim, Cotton',
      'Received',
      ['https://example.com/image1.jpg'],
      'Authentic vintage with red tab',
      new Date(),
      new Date()
    ]);
    
    const item1Id = item1Result.rows[0].id;
    
    // Sample item 2
    const item2Result = await executeQuery(supabasePool, `
      INSERT INTO items (customer_id, reference_id, name, description, brand, category, condition, size, color, materials, status, image_urls, notes, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (reference_id) DO UPDATE 
      SET name = EXCLUDED.name, status = EXCLUDED.status
      RETURNING id
    `, [
      customerId,
      'DT-2023-002',
      'Nike Air Jordan 1 Retro High',
      'Used but excellent condition Nike Air Jordan 1 Retro High OG Chicago',
      'Nike',
      'Footwear',
      'Good',
      'EU 42',
      'Red/White/Black',
      'Leather, Rubber',
      'Listed',
      ['https://example.com/shoes1.jpg'],
      'Original box included',
      new Date(),
      new Date()
    ]);
    
    const item2Id = item2Result.rows[0].id;
    
    // Step 5: Migrate pricing data
    console.log("Migrating pricing data...");
    
    await executeQuery(supabasePool, `
      INSERT INTO pricing (item_id, suggested_price, actual_price, commission_rate, payout_amount, currency_code, accepted_by_customer, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      item1Id,
      120.00,
      120.00,
      0.4,
      72.00,
      'EUR',
      true,
      new Date(),
      new Date()
    ]);
    
    await executeQuery(supabasePool, `
      INSERT INTO pricing (item_id, suggested_price, actual_price, commission_rate, payout_amount, currency_code, accepted_by_customer, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      item2Id,
      250.00,
      250.00,
      0.4,
      150.00,
      'EUR',
      true,
      new Date(),
      new Date()
    ]);
    
    // Step 6: Migrate sample order
    console.log("Migrating sample orders...");
    
    const orderResult = await executeQuery(supabasePool, `
      INSERT INTO orders (order_number, customer_id, order_date, status, shipping_address, billing_address, total_amount, shipping_cost, tracking_code, payment_method, notes, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (order_number) DO UPDATE 
      SET status = EXCLUDED.status
      RETURNING id
    `, [
      'ORD-2023-001',
      customerId,
      new Date(),
      'Paid',
      '123 Buyer Street, Amsterdam',
      '123 Buyer Street, Amsterdam',
      120.00,
      5.00,
      'TR123456789NL',
      'Credit Card',
      'Please ship with care',
      new Date(),
      new Date()
    ]);
    
    const orderId = orderResult.rows[0].id;
    
    // Link item to order
    await executeQuery(supabasePool, `
      INSERT INTO order_items (order_id, item_id, price, quantity, created_at) 
      VALUES ($1, $2, $3, $4, $5)
    `, [
      orderId,
      item1Id,
      120.00,
      1,
      new Date()
    ]);
    
    console.log("Migration completed successfully");
    
  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  } finally {
    // Close the connection pool
    await supabasePool.end();
  }
}

// Export the migration function
export { migrateData };

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateData()
    .then(() => {
      console.log("Migration to Supabase complete!");
      process.exit(0);
    })
    .catch(error => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}