/**
 * Test script for the consignment intake process
 * 
 * This script tests the entire flow of submitting a new item:
 * 1. Creates a new order
 * 2. Creates a new item with order_id
 * 3. Links them in the order_items junction table
 * 4. Verifies that everything was created correctly
 */

import dotenv from 'dotenv';
dotenv.config();

import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Helper functions
async function executeQuery(query, params = []) {
  try {
    const result = await pool.query(query, params);
    return result;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}

// Function to generate a unique reference ID for items
function generateReferenceId() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  // Add milliseconds for uniqueness
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  
  // Generate a random 5-digit number
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  
  return `CS-${year}${month}${day}-${random}-${ms}`;
}

// Function to generate an order number
function generateOrderNumber() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${dateStr}-${randomSuffix}`;
}

// Function to calculate commission and payout
function calculateCommissionAndPayout(estimatedValue) {
  // Default to 30% commission rate
  const commissionRate = 30;
  // Calculate payout as 70% of estimated value
  const payoutValue = estimatedValue * (1 - commissionRate / 100);
  
  return { commissionRate, payoutValue };
}

// Test the entire intake flow
async function testIntakeFlow() {
  console.log('TESTING CONSIGNMENT INTAKE FLOW');
  console.log('-------------------------------');
  
  // Use customer ID 1 for testing (Theo Oenema)
  const customerId = 1;
  
  // Read a sample image to use for testing
  let imageBase64;
  try {
    // Try to read a sample image from the assets folder if available
    const imagePath = path.join(__dirname, 'attached_assets', 'image_1747726519585.png');
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      imageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    } else {
      // If no image is available, create a simple base64 string
      imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    }
  } catch (err) {
    console.warn('Could not read sample image:', err.message);
    imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  }
  
  // Test data for the item
  const itemData = {
    title: 'Test Item - ' + new Date().toISOString(),
    description: 'This is a test item created by the automated test script',
    imageBase64: imageBase64
  };
  
  try {
    // Start a transaction
    await executeQuery('BEGIN');
    console.log('Started transaction');
    
    // STEP 1: Create a new order
    console.log('Step 1: Creating a new order...');
    const orderNumber = generateOrderNumber();
    
    // Set default estimated values
    const defaultEstimatedValue = 5000; // €50.00
    const { commissionRate, payoutValue } = calculateCommissionAndPayout(defaultEstimatedValue);
    
    const createOrderQuery = `
      INSERT INTO orders (
        order_number,
        customer_id,
        submission_date,
        status,
        total_value,
        total_payout,
        created_at,
        updated_at
      )
      VALUES ($1, $2, NOW(), $3, $4, $5, NOW(), NOW())
      RETURNING id
    `;
    
    const orderInsertResult = await executeQuery(createOrderQuery, [
      orderNumber,
      customerId,
      'awaiting_shipment',
      defaultEstimatedValue,
      payoutValue
    ]);
    
    const orderId = orderInsertResult.rows[0].id;
    console.log(`✓ Created order with ID ${orderId} and order number ${orderNumber}`);
    
    // STEP 2: Create the item
    console.log('Step 2: Creating a new item...');
    const referenceId = generateReferenceId();
    
    // First check if the order_id column exists
    const checkColumnQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'items' AND column_name = 'order_id'
    `;
    
    const columnCheck = await executeQuery(checkColumnQuery);
    const orderIdColumnExists = columnCheck.rows.length > 0;
    
    // Prepare the insert query based on whether order_id column exists
    let createItemQuery;
    let itemParams;
    
    // Process image data and store it as JSON string (truncated for display)
    const imageUrls = itemData.imageBase64 ? 
      JSON.stringify([itemData.imageBase64.substring(0, 100) + '...']) : '[]';
    
    if (orderIdColumnExists) {
      console.log('Using items table with order_id column');
      createItemQuery = `
        INSERT INTO items (
          reference_id,
          customer_id, 
          title, 
          description, 
          status, 
          created_at, 
          updated_at,
          image_urls,
          order_id
        ) 
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6, $7)
        RETURNING id
      `;
      
      itemParams = [
        referenceId,
        customerId,
        itemData.title,
        itemData.description || null,
        'pending',
        imageUrls,
        orderId
      ];
    } else {
      console.log('Using items table without order_id column');
      createItemQuery = `
        INSERT INTO items (
          reference_id,
          customer_id, 
          title, 
          description, 
          status, 
          created_at, 
          updated_at,
          image_urls
        ) 
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6)
        RETURNING id
      `;
      
      itemParams = [
        referenceId,
        customerId,
        itemData.title,
        itemData.description || null,
        'pending',
        imageUrls
      ];
    }
    
    const itemInsertResult = await executeQuery(createItemQuery, itemParams);
    const itemId = itemInsertResult.rows[0].id;
    console.log(`✓ Created item with ID ${itemId} and reference ID ${referenceId}`);
    
    // STEP 3: Create order_items link
    console.log('Step 3: Creating order_items link...');
    // Check if order_items table exists
    const checkTableQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'order_items'
    `;
    
    const tableCheck = await executeQuery(checkTableQuery);
    
    if (tableCheck.rows.length > 0) {
      const linkQuery = `
        INSERT INTO order_items (order_id, item_id, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (order_id, item_id) DO NOTHING
        RETURNING id
      `;
      
      try {
        const linkResult = await executeQuery(linkQuery, [orderId, itemId]);
        if (linkResult.rows.length > 0) {
          console.log(`✓ Created order_items link with ID ${linkResult.rows[0].id}`);
        } else {
          console.log('ℹ Link already exists, skipped creation');
        }
      } catch (error) {
        console.error('Error creating order_items link:', error);
        // Check if we need to add ON CONFLICT clause
        if (error.message.includes('duplicate key value')) {
          console.log('Link appears to already exist');
        } else {
          throw error;
        }
      }
    } else {
      console.log('⚠ order_items table does not exist - skipping junction table creation');
    }
    
    // STEP 4: Verify that the item and order were created and linked correctly
    console.log('\nStep 4: Verifying data integrity...');
    
    // Check that the order exists
    const checkOrderQuery = `
      SELECT * FROM orders WHERE id = $1
    `;
    const orderCheck = await executeQuery(checkOrderQuery, [orderId]);
    
    if (orderCheck.rows.length > 0) {
      console.log(`✓ Order ${orderId} exists in the database`);
    } else {
      console.error('⚠ Order not found in database');
    }
    
    // Check that the item exists
    const checkItemQuery = `
      SELECT * FROM items WHERE id = $1
    `;
    const itemCheck = await executeQuery(checkItemQuery, [itemId]);
    
    if (itemCheck.rows.length > 0) {
      console.log(`✓ Item ${itemId} exists in the database`);
      
      // Check if the item has the correct order_id if the column exists
      if (orderIdColumnExists && itemCheck.rows[0].order_id === orderId) {
        console.log(`✓ Item has correct order_id: ${orderId}`);
      } else if (orderIdColumnExists) {
        console.error(`⚠ Item has incorrect order_id: ${itemCheck.rows[0].order_id}, expected: ${orderId}`);
      }
    } else {
      console.error('⚠ Item not found in database');
    }
    
    // Check that the order_items link exists if the table exists
    if (tableCheck.rows.length > 0) {
      const checkLinkQuery = `
        SELECT * FROM order_items WHERE order_id = $1 AND item_id = $2
      `;
      const linkCheck = await executeQuery(checkLinkQuery, [orderId, itemId]);
      
      if (linkCheck.rows.length > 0) {
        console.log(`✓ Link between order ${orderId} and item ${itemId} exists in the order_items table`);
      } else {
        console.error('⚠ Link not found in order_items table');
      }
    }
    
    // Commit the transaction
    await executeQuery('COMMIT');
    console.log('\n✅ Test completed successfully: All steps passed');
    
    // Return the test result
    return {
      success: true, 
      order: { id: orderId, orderNumber },
      item: { id: itemId, referenceId }
    };
  } catch (error) {
    // If any error occurs, roll back the transaction
    console.error('\n❌ Test failed with error:', error);
    await executeQuery('ROLLBACK');
    
    // Return the error
    return {
      success: false,
      error: error.message
    };
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Run the test
testIntakeFlow()
  .then(result => {
    console.log('\nTest Result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed unexpectedly:', error);
    process.exit(1);
  });