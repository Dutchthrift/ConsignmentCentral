// Seed Supabase Data Script
// This script inserts sample data into your Supabase database
// for testing the Dutch Thrift application

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

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

// Utility function for executing queries with retry
async function executeQuery(query, params = [], retries = 3) {
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

// Helper function to hash a password
async function hashPassword(password) {
  // Simple hash for demo purposes - in production use bcrypt
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString('hex') + '.' + salt);
    });
  });
}

// Create admin user
async function createAdminUser() {
  console.log("Creating admin user...");
  const passwordHash = await hashPassword('admin123');
  
  try {
    // Check if admin user already exists
    const existingAdmin = await executeQuery(
      "SELECT * FROM admin_users WHERE email = $1",
      ['admin@dutchthrift.com']
    );
    
    if (existingAdmin.rows.length > 0) {
      console.log("Admin user already exists, skipping creation");
      return existingAdmin.rows[0];
    }
    
    // Create admin user
    const result = await executeQuery(
      `INSERT INTO admin_users (email, password, name, role, provider, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        'admin@dutchthrift.com',
        passwordHash,
        'Admin User',
        'admin',
        'local',
        new Date()
      ]
    );
    
    console.log("✅ Created admin user: admin@dutchthrift.com (password: admin123)");
    return result.rows[0];
  } catch (error) {
    console.error("❌ Failed to create admin user:", error.message);
    throw error;
  }
}

// Create consignor user and customer
async function createConsignorUser() {
  console.log("Creating test consignor...");
  const passwordHash = await hashPassword('password123');
  
  try {
    // Check if consignor user already exists
    const existingUser = await executeQuery(
      "SELECT * FROM users WHERE email = $1",
      ['consignor@example.com']
    );
    
    if (existingUser.rows.length > 0) {
      console.log("Consignor user already exists, skipping creation");
      return existingUser.rows[0];
    }
    
    // Create consignor user
    const userResult = await executeQuery(
      `INSERT INTO users (email, password, name, role, provider, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        'consignor@example.com',
        passwordHash,
        'Test Consignor',
        'consignor',
        'local',
        new Date()
      ]
    );
    
    // Create customer record
    const customerResult = await executeQuery(
      `INSERT INTO customers (email, name, phone, address, city, postal_code, country, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        'consignor@example.com',
        'Test Consignor',
        '1234567890',
        '123 Test Street',
        'Amsterdam',
        '1000AA',
        'Netherlands',
        new Date()
      ]
    );
    
    console.log("✅ Created consignor user: consignor@example.com (password: password123)");
    return { user: userResult.rows[0], customer: customerResult.rows[0] };
  } catch (error) {
    console.error("❌ Failed to create consignor user:", error.message);
    throw error;
  }
}

// Create sample items
async function createSampleItems(customer) {
  console.log("Creating sample items...");
  
  if (!customer || !customer.id) {
    console.error("❌ Invalid customer object:", customer);
    throw new Error("Customer object is invalid or missing id property");
  }
  
  const customerId = customer.id;
  
  try {
    // Check if items already exist for this customer
    const existingItems = await executeQuery(
      "SELECT * FROM items WHERE customer_id = $1",
      [customerId]
    );
    
    if (existingItems.rows.length > 0) {
      console.log(`${existingItems.rows.length} items already exist for this customer, skipping creation`);
      return existingItems.rows;
    }
    
    // Sample items data
    const items = [
      {
        referenceId: 'DT-2023-001',
        title: 'Vintage Levi\'s 501 Jeans',
        description: 'Excellent condition vintage Levi\'s 501 jeans from the 1990s',
        brand: 'Levi\'s',
        category: 'Clothing',
        condition: 'Excellent',
        size: '32x34',
        color: 'Blue',
        materials: 'Denim, Cotton',
        status: 'Received',
        imageUrls: ['https://example.com/image1.jpg'],
        notes: 'Authentic vintage with red tab'
      },
      {
        referenceId: 'DT-2023-002',
        title: 'Nike Air Jordan 1 Retro High',
        description: 'Used but excellent condition Nike Air Jordan 1 Retro High OG Chicago',
        brand: 'Nike',
        category: 'Footwear',
        condition: 'Good',
        size: 'EU 42',
        color: 'Red/White/Black',
        materials: 'Leather, Rubber',
        status: 'Listed',
        imageUrls: ['https://example.com/shoes1.jpg'],
        notes: 'Original box included'
      }
    ];
    
    // Insert items
    const insertedItems = [];
    
    for (const item of items) {
      // Create item
      const itemResult = await executeQuery(
        `INSERT INTO items (
          customer_id, reference_id, title, description, brand, category, 
          condition, size, color, materials, status, image_urls, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [
          customerId,
          item.referenceId,
          item.title,
          item.description,
          item.brand,
          item.category,
          item.condition,
          item.size,
          item.color,
          item.materials,
          item.status,
          item.imageUrls,
          item.notes,
          new Date()
        ]
      );
      
      const newItem = itemResult.rows[0];
      insertedItems.push(newItem);
      
      // Create pricing for item
      const pricingResult = await executeQuery(
        `INSERT INTO pricing (
          item_id, suggested_price, actual_price, commission_rate, 
          payout_amount, currency_code, accepted_by_customer, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          newItem.id,
          item.referenceId === 'DT-2023-001' ? 120.00 : 250.00,
          item.referenceId === 'DT-2023-001' ? 120.00 : 250.00,
          0.4,
          item.referenceId === 'DT-2023-001' ? 72.00 : 150.00,
          'EUR',
          true,
          new Date()
        ]
      );
      
      console.log(`✅ Created item: ${item.title} with pricing`);
    }
    
    return insertedItems;
  } catch (error) {
    console.error("❌ Failed to create sample items:", error.message);
    throw error;
  }
}

// Create sample order
async function createSampleOrder(customer, items) {
  console.log("Creating sample order...");
  const customerId = customer.id;
  
  try {
    // Check if orders already exist
    const existingOrders = await executeQuery(
      "SELECT * FROM orders WHERE customer_id = $1",
      [customerId]
    );
    
    if (existingOrders.rows.length > 0) {
      console.log("Orders already exist, skipping creation");
      return existingOrders.rows[0];
    }
    
    // Create order
    const orderResult = await executeQuery(
      `INSERT INTO orders (
        order_number, customer_id, order_date, status, shipping_address, 
        billing_address, total_amount, shipping_cost, tracking_code, 
        payment_method, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
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
        new Date()
      ]
    );
    
    const order = orderResult.rows[0];
    
    // Add first item to order
    if (items && items.length > 0) {
      await executeQuery(
        `INSERT INTO order_items (order_id, item_id, price, quantity, created_at) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          order.id,
          items[0].id,
          120.00,
          1,
          new Date()
        ]
      );
    }
    
    console.log("✅ Created sample order with order item");
    return order;
  } catch (error) {
    console.error("❌ Failed to create sample order:", error.message);
    throw error;
  }
}

// Main function to seed data
async function seedData() {
  try {
    console.log("Starting data seeding for Dutch Thrift application...");
    
    // Create admin user
    const admin = await createAdminUser();
    
    // Create consignor user and customer
    const consignorData = await createConsignorUser();
    
    console.log("Consignor data:", JSON.stringify(consignorData, null, 2));
    
    // Check if we got a valid customer object
    if (!consignorData || !consignorData.customer) {
      // Fetch customer data directly if it wasn't properly returned
      const customerResult = await executeQuery(
        "SELECT * FROM customers WHERE email = $1",
        ['consignor@example.com']
      );
      
      if (customerResult.rows.length === 0) {
        throw new Error("Failed to find customer record for consignor@example.com");
      }
      
      const customer = customerResult.rows[0];
      console.log("Retrieved customer:", JSON.stringify(customer, null, 2));
      
      // Create sample items
      const items = await createSampleItems(customer);
      
      // Create sample order
      const order = await createSampleOrder(customer, items);
    } else {
      // Use the customer data from createConsignorUser
      const customer = consignorData.customer;
      
      // Create sample items
      const items = await createSampleItems(customer);
      
      // Create sample order
      const order = await createSampleOrder(customer, items);
    }
    
    console.log("\n✅ Supabase database seeded successfully with sample data");
    console.log("\nUse the following credentials to test the application:");
    console.log("Admin: admin@dutchthrift.com / admin123");
    console.log("Consignor: consignor@example.com / password123");
    
  } catch (error) {
    console.error("\n❌ Data seeding failed:", error.message);
    process.exit(1);
  } finally {
    // Close connection pool
    await pool.end();
  }
}

// Run the seeding
seedData();