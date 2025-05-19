/**
 * This script creates comprehensive test data for the existing consignor account
 * including orders, items, price quotes, and valuations without deleting existing data.
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;
dotenv.config();

// Ensure DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for SSL connections to Supabase
  }
});

async function executeQuery(query, params = [], retries = 3) {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      return result;
    } finally {
      client.release();
    }
  } catch (error) {
    if (retries > 0) {
      console.warn(`Query failed, retrying... (${retries} attempts left)`);
      console.error('Error:', error.message);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return executeQuery(query, params, retries - 1);
    }
    throw error;
  }
}

// Status options for items and orders
const itemStatuses = [
  'pending', 'analyzed', 'approved', 'listed', 
  'sold', 'shipped', 'completed', 'returned'
];

const orderStatuses = [
  'pending', 'processing', 'shipped', 'delivered', 'cancelled'
];

const categories = [
  'Clothing', 'Shoes', 'Accessories', 'Jewelry', 
  'Electronics', 'Home Decor', 'Books', 'Art'
];

const brands = [
  'Nike', 'Adidas', 'Gucci', 'Louis Vuitton', 'H&M', 
  'Zara', 'Uniqlo', 'Patagonia', 'The North Face', 'IKEA'
];

const conditions = [
  'New with tags', 'Like new', 'Gently used', 
  'Well used', 'Heavily used', 'For parts'
];

// Random data generation helpers
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date) {
  return date.toISOString();
}

function getRandomPrice(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateOrderNumber() {
  return `ORD-${Date.now().toString().substring(7)}-${getRandomInt(100, 999)}`;
}

async function createItemForCustomer(customerId, status = null) {
  const itemStatus = status || getRandomElement(itemStatuses);
  const brand = getRandomElement(brands);
  const category = getRandomElement(categories);
  const condition = getRandomElement(conditions);
  const now = new Date();
  
  // Create a reference ID
  const referenceId = `REF-${uuidv4().substring(0, 8).toUpperCase()}`;
  
  // Generate random price data
  const marketPrice = getRandomPrice(30, 200);
  const listingPrice = Math.round(marketPrice * (getRandomInt(90, 110) / 100)); // +/- 10%
  const commissionRate = 40; // 40% commission rate
  const sellerPayout = Math.round(listingPrice * (1 - commissionRate / 100));
  
  // Insert the item
  console.log(`Creating a new ${itemStatus} item for customer ${customerId}...`);
  const itemResult = await executeQuery(`
    INSERT INTO items (
      reference_id, customer_id, title, description, category, 
      status, image_url, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    referenceId,
    customerId,
    `${brand} ${getRandomElement(['Shirt', 'Pants', 'Jacket', 'Dress', 'Shoes', 'Watch'])}`,
    `High quality ${getRandomElement(['casual', 'formal', 'vintage', 'designer'])} item in ${condition} condition`,
    category,
    itemStatus,
    `https://source.unsplash.com/400x300/?${encodeURIComponent(category.toLowerCase())}`,
    now,
    now
  ]);
  
  const item = itemResult.rows[0];
  console.log(`Created item: ${item.id} - ${item.title}`);
  
  // Add analysis data
  await executeQuery(`
    INSERT INTO analysis (
      item_id, authenticity_score, condition_score, market_demand_score,
      ai_detection_results, created_at, updated_at, notes,
      style_analysis, material_analysis, brand_analysis
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
    item.id,
    (Math.random() * 0.5 + 0.5).toFixed(2), // 0.5-1.0 authenticity
    (Math.random() * 0.5 + 0.5).toFixed(2), // 0.5-1.0 condition
    (Math.random() * 0.5 + 0.5).toFixed(2), // 0.5-1.0 market demand
    JSON.stringify({ 
      confidence: (Math.random() * 0.3 + 0.7).toFixed(2),
      detected_features: ['Feature 1', 'Feature 2', 'Feature 3'] 
    }),
    formatDate(now),
    formatDate(now),
    `Additional notes about this ${brand} ${condition} item in the ${category} category`,
    `Style analysis indicates this is a ${getRandomElement(['modern', 'vintage', 'classic', 'trendy'])} design`,
    `Made with high-quality ${getRandomElement(['cotton', 'leather', 'synthetic', 'wool', 'silk'])} materials`,
    `Identified as an authentic ${brand} product from their ${getRandomElement(['summer', 'winter', 'spring', 'fall'])} collection`
  ]);
  
  // Add pricing data
  await executeQuery(`
    INSERT INTO pricing (
      item_id, average_market_price, suggested_listing_price, 
      commission_rate, suggested_payout, final_sale_price,
      final_payout, payout_type, store_credit_amount, 
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
    item.id,
    marketPrice,
    listingPrice,
    commissionRate,
    sellerPayout,
    itemStatus === 'sold' || itemStatus === 'shipped' || itemStatus === 'completed' ? listingPrice : null,
    itemStatus === 'sold' || itemStatus === 'shipped' || itemStatus === 'completed' ? sellerPayout : null,
    getRandomElement(['bank', 'cash', 'storecredit']),
    Math.round(sellerPayout * 1.1), // 10% bonus for store credit
    formatDate(now),
    formatDate(now)
  ]);
  
  // Add shipping data for sold/shipped/completed items
  if (['sold', 'shipped', 'completed'].includes(itemStatus)) {
    await executeQuery(`
      INSERT INTO shipping (
        item_id, tracking_number, carrier, label_url, created_at
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      item.id,
      `TRACK${getRandomInt(10000000, 99999999)}`,
      getRandomElement(['PostNL', 'DHL', 'UPS', 'FedEx']),
      'https://example.com/label.pdf',
      formatDate(getRandomDate(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7), now)) // Past week
    ]);
  }
  
  return item;
}

async function createOrderForCustomer(customerId, items) {
  if (items.length === 0) {
    console.log('No items provided for order creation, skipping');
    return null;
  }
  
  const status = getRandomElement(orderStatuses);
  const orderNumber = generateOrderNumber();
  const submissionDate = getRandomDate(new Date(2023, 0, 1), new Date());
  
  // Calculate totals
  const totalAmount = items.reduce((sum, item) => {
    return sum + (item.final_sale_price || 0);
  }, 0);
  
  const payoutAmount = Math.round(totalAmount * 0.6); // 40% commission
  
  // Create order
  console.log(`Creating a new ${status} order for customer ${customerId} with ${items.length} items...`);
  
  const orderResult = await executeQuery(`
    INSERT INTO orders (
      order_number, customer_id, status, submission_date,
      total_value, total_payout, tracking_code, 
      notes, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    orderNumber,
    customerId,
    status,
    submissionDate,
    totalAmount || 0,
    payoutAmount || 0,
    status === 'shipped' || status === 'delivered' ? `SHIP${getRandomInt(100000, 999999)}` : null,
    `Test order with ${items.length} items`,
    submissionDate,
    submissionDate
  ]);
  
  const order = orderResult.rows[0];
  console.log(`Created order: ${order.id} - ${order.order_number} (${status})`);
  
  // Link items to order
  for (const item of items) {
    await executeQuery(`
      INSERT INTO order_items (
        order_id, item_id
      ) VALUES ($1, $2)
    `, [
      order.id,
      item.id
    ]);
    console.log(`Linked item ${item.id} to order ${order.id}`);
  }
  
  return order;
}

async function seedTestData() {
  try {
    // Find our consignor by email
    const consignorResult = await executeQuery(`
      SELECT * FROM customers WHERE email = 'theooenema@hotmail.com'
    `);
    
    if (consignorResult.rows.length === 0) {
      throw new Error("Consignor with email 'theooenema@hotmail.com' not found");
    }
    
    const consignor = consignorResult.rows[0];
    console.log(`Found consignor: ${consignor.id} - ${consignor.name || consignor.email}`);
    
    // Create items in different statuses for the consignor
    const itemsToCreate = [
      { status: 'pending', count: 3 },
      { status: 'analyzed', count: 2 },
      { status: 'approved', count: 2 },
      { status: 'listed', count: 3 },
      { status: 'sold', count: 2 },
      { status: 'shipped', count: 1 },
      { status: 'completed', count: 2 },
      { status: 'returned', count: 1 }
    ];
    
    const allItems = [];
    
    for (const group of itemsToCreate) {
      console.log(`Creating ${group.count} items with status '${group.status}'...`);
      for (let i = 0; i < group.count; i++) {
        const item = await createItemForCustomer(consignor.id, group.status);
        allItems.push(item);
      }
    }
    
    console.log(`Created ${allItems.length} items for consignor ${consignor.id}`);
    
    // Group items by status
    const itemsByStatus = {};
    for (const item of allItems) {
      if (!itemsByStatus[item.status]) {
        itemsByStatus[item.status] = [];
      }
      itemsByStatus[item.status].push(item);
    }
    
    // Create orders for appropriate item statuses
    const orderableStatuses = ['sold', 'shipped', 'completed', 'returned'];
    let orderItems = [];
    
    for (const status of orderableStatuses) {
      if (itemsByStatus[status]?.length > 0) {
        orderItems = orderItems.concat(itemsByStatus[status]);
      }
    }
    
    // Split items into 2-3 separate orders
    const batchSize = Math.ceil(orderItems.length / Math.min(3, Math.max(1, Math.floor(orderItems.length / 2))));
    const itemBatches = [];
    
    for (let i = 0; i < orderItems.length; i += batchSize) {
      itemBatches.push(orderItems.slice(i, i + batchSize));
    }
    
    console.log(`Creating ${itemBatches.length} orders from ${orderItems.length} sold/shipped/completed items`);
    
    // Create orders with the batched items
    const orders = [];
    for (const batch of itemBatches) {
      if (batch.length > 0) {
        const order = await createOrderForCustomer(consignor.id, batch);
        if (order) {
          orders.push(order);
        }
      }
    }
    
    console.log(`Created ${orders.length} orders for consignor ${consignor.id}`);
    console.log('Test data creation completed successfully!');
    
  } catch (error) {
    console.error('Error during data seeding:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('Starting test data creation...');
    await seedTestData();
    console.log('Test data creation completed successfully!');
  } catch (error) {
    console.error('Error during test data creation:', error);
  } finally {
    await pool.end();
  }
}

// Execute the main function
main();