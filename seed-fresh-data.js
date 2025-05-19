/**
 * This script removes all existing test data except for the admin and consignor login accounts,
 * then creates comprehensive new test data including:
 * - Orders with various statuses
 * - Items with detailed attributes
 * - Price quotes
 * - Valuation data
 * - Customer information
 */

import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

const { Pool } = pg;
dotenv.config();

// Ensure DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
    if (retries > 0 && error.code !== '42P01') { // Don't retry if table doesn't exist
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
  'pending_review', 'accepted', 'rejected', 'listed', 
  'sold', 'shipped', 'completed', 'returned'
];

const orderStatuses = [
  'draft', 'submitted', 'processing', 'approved', 
  'shipped', 'completed', 'cancelled'
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

function getRandomPrice(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

async function cleanExistingData() {
  console.log('Cleaning existing data while preserving admin and consignor accounts...');
  
  try {
    // Delete in the correct order to respect foreign key constraints
    console.log('Deleting order_items...');
    await executeQuery(`
      DELETE FROM order_items WHERE 1=1;
    `);
    
    console.log('Deleting ml_training_examples...');
    await executeQuery(`
      DELETE FROM ml_training_examples WHERE 1=1;
    `);
    
    console.log('Deleting ml_training_sessions...');
    await executeQuery(`
      DELETE FROM ml_training_sessions WHERE 1=1;
    `);
    
    console.log('Deleting ml_model_configs...');
    await executeQuery(`
      DELETE FROM ml_model_configs WHERE 1=1;
    `);
    
    console.log('Deleting shipping...');
    await executeQuery(`
      DELETE FROM shipping WHERE 1=1;
    `);
    
    console.log('Deleting pricing...');
    await executeQuery(`
      DELETE FROM pricing WHERE 1=1;
    `);
    
    console.log('Deleting analysis...');
    await executeQuery(`
      DELETE FROM analysis WHERE 1=1;
    `);
    
    console.log('Deleting orders...');
    await executeQuery(`
      DELETE FROM orders WHERE 1=1;
    `);
    
    console.log('Deleting orders_summary...');
    await executeQuery(`
      DELETE FROM orders_summary WHERE 1=1;
    `);
    
    console.log('Deleting items...');
    await executeQuery(`
      DELETE FROM items WHERE 1=1;
    `);
    
    console.log('Data cleanup completed successfully');
  } catch (error) {
    console.error('Error during data cleanup:', error);
    throw error;
  }
}

async function createItems(customerId, count) {
  console.log(`Creating ${count} items for customer ${customerId}...`);
  const items = [];
  
  for (let i = 0; i < count; i++) {
    const status = getRandomElement(itemStatuses);
    const askingPrice = getRandomPrice(15, 200);
    const finalPrice = status === 'sold' || status === 'shipped' || status === 'completed' 
      ? getRandomPrice(askingPrice * 0.8, askingPrice * 1.2) 
      : null;
      
    // Create base item
    const [item] = (await executeQuery(`
      INSERT INTO items (
        customer_id, status, title, description, brand, category, 
        condition, asking_price, final_price, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) RETURNING *
    `, [
      customerId,
      status,
      `${getRandomElement(brands)} ${getRandomElement(['Shirt', 'Pants', 'Jacket', 'Dress', 'Shoes', 'Watch'])}`,
      `High quality ${getRandomElement(['casual', 'formal', 'vintage', 'designer'])} item in ${getRandomElement(conditions)} condition`,
      getRandomElement(brands),
      getRandomElement(categories),
      getRandomElement(conditions),
      askingPrice,
      finalPrice,
      getRandomDate(new Date(2023, 0, 1), new Date()),
      new Date()
    ])).rows;
    
    // Add analysis data
    await executeQuery(`
      INSERT INTO analysis (
        item_id, brand, category, product_type, model, condition, 
        color, material, size, pattern, style, age, 
        description, confidence_score, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
    `, [
      item.id,
      item.brand,
      item.category,
      getRandomElement(['Top', 'Bottom', 'Outerwear', 'Footwear', 'Accessory']),
      `Model ${getRandomInt(1000, 9999)}`,
      item.condition,
      getRandomElement(['Black', 'White', 'Blue', 'Red', 'Green', 'Yellow', 'Brown', 'Grey']),
      getRandomElement(['Cotton', 'Polyester', 'Leather', 'Wool', 'Silk', 'Denim', 'Canvas']),
      getRandomElement(['XS', 'S', 'M', 'L', 'XL', 'XXL', '38', '40', '42', '44']),
      getRandomElement(['Solid', 'Striped', 'Plaid', 'Polka dot', 'Floral', 'Geometric']),
      getRandomElement(['Casual', 'Formal', 'Sporty', 'Vintage', 'Minimalist', 'Bohemian']),
      getRandomElement(['New', '< 1 year', '1-2 years', '2-5 years', '5+ years']),
      `AI-analyzed description of ${item.title} with detailed features`,
      (Math.random() * 0.5 + 0.5).toFixed(2), // 0.5-1.0 confidence
      item.created_at
    ]);
    
    // Add pricing data
    const recommendedPrice = getRandomPrice(askingPrice * 0.8, askingPrice * 1.2);
    const marketValue = getRandomPrice(recommendedPrice * 0.8, recommendedPrice * 1.2);
    
    await executeQuery(`
      INSERT INTO pricing (
        item_id, market_value, recommended_price, min_acceptable_price,
        commission_rate, commission_amount, seller_payout, store_credit_bonus,
        store_credit_amount, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
    `, [
      item.id,
      marketValue,
      recommendedPrice,
      recommendedPrice * 0.8,
      0.4, // 40% commission
      recommendedPrice * 0.4,
      recommendedPrice * 0.6,
      0.1, // 10% store credit bonus
      recommendedPrice * 0.6 * 1.1,
      item.created_at
    ]);
    
    // Add shipping data for sold/shipped/completed items
    if (['sold', 'shipped', 'completed'].includes(status)) {
      await executeQuery(`
        INSERT INTO shipping (
          item_id, shipping_method, tracking_number, shipping_cost,
          shipping_date, estimated_delivery, actual_delivery, carrier,
          created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        )
      `, [
        item.id,
        getRandomElement(['Standard', 'Express', 'Priority', 'Economy']),
        `TRK${getRandomInt(1000000, 9999999)}`,
        getRandomPrice(5, 15),
        status !== 'sold' ? getRandomDate(new Date(item.created_at), new Date()) : null,
        status !== 'sold' ? getRandomDate(new Date(), new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)) : null,
        status === 'completed' ? getRandomDate(new Date(item.created_at), new Date()) : null,
        getRandomElement(['PostNL', 'DHL', 'UPS', 'FedEx']),
        new Date()
      ]);
    }
    
    items.push(item);
  }
  
  return items;
}

async function createOrders(customerId, items) {
  console.log(`Creating orders for customer ${customerId}...`);
  
  // Group items into 1-3 orders
  const numberOfOrders = Math.min(3, Math.ceil(items.length / 3));
  const itemGroups = Array(numberOfOrders).fill().map(() => []);
  
  // Distribute items into order groups
  items.forEach((item, index) => {
    const groupIndex = index % numberOfOrders;
    itemGroups[groupIndex].push(item);
  });
  
  const orders = [];
  
  for (let i = 0; i < numberOfOrders; i++) {
    const groupItems = itemGroups[i];
    if (groupItems.length === 0) continue;
    
    const status = getRandomElement(orderStatuses);
    const submissionDate = getRandomDate(new Date(2023, 0, 1), new Date());
    
    // Calculate totals
    const totalAmount = groupItems.reduce((sum, item) => sum + item.asking_price, 0);
    const payoutAmount = totalAmount * 0.6; // 40% commission
    
    // Create order
    const [order] = (await executeQuery(`
      INSERT INTO orders (
        customer_id, status, order_number, submission_date,
        total_amount, payout_amount, tracking_code, payment_method,
        payment_status, payout_method, payout_status, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      ) RETURNING *
    `, [
      customerId,
      status,
      `ORD-${getRandomInt(10000, 99999)}`,
      submissionDate,
      totalAmount,
      payoutAmount,
      status === 'shipped' || status === 'completed' ? `SHIP${getRandomInt(100000, 999999)}` : null,
      getRandomElement(['Credit', 'Bank transfer', 'Store credit']),
      status === 'completed' ? 'paid' : 'pending',
      getRandomElement(['Bank transfer', 'Store credit']),
      status === 'completed' ? 'paid' : 'pending',
      `Test order with ${groupItems.length} items`
    ])).rows;
    
    // Link items to order
    for (const item of groupItems) {
      await executeQuery(`
        INSERT INTO order_items (
          order_id, item_id, quantity, price_at_order,
          created_at
        ) VALUES (
          $1, $2, $3, $4, $5
        )
      `, [
        order.id,
        item.id,
        1,
        item.asking_price,
        submissionDate
      ]);
    }
    
    orders.push(order);
  }
  
  return orders;
}

async function seedNewData() {
  try {
    // Retrieve consignor customer
    const consignorResult = await executeQuery(`
      SELECT * FROM customers WHERE email = 'theooenema@hotmail.com' LIMIT 1
    `);
    
    if (consignorResult.rows.length === 0) {
      throw new Error('Consignor account not found');
    }
    
    const consignor = consignorResult.rows[0];
    console.log('Found consignor account:', consignor);
    
    // Create items for the consignor
    const items = await createItems(consignor.id, 12);
    console.log(`Created ${items.length} items for consignor`);
    
    // Create orders using the items
    const orders = await createOrders(consignor.id, items);
    console.log(`Created ${orders.length} orders for consignor`);
    
    console.log('Data seeding completed successfully');
  } catch (error) {
    console.error('Error during data seeding:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('Starting database refresh...');
    
    // Clean existing data except admin and consignor accounts
    await cleanExistingData();
    
    // Create new test data
    await seedNewData();
    
    console.log('Database refresh completed successfully');
  } catch (error) {
    console.error('Error during database refresh:', error);
  } finally {
    await pool.end();
  }
}

// Execute the main function
main();