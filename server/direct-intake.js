/**
 * Direct database operations for item intake
 * This module provides reliable SQL operations to handle item and order creation
 */

const { Pool } = require('pg');

// Create a new pool using the DATABASE_URL environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Generate a unique reference ID for an item
 * @returns {string} Reference ID in format CS-YYMMDD-XXX
 */
function generateReferenceId() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `CS-${dateStr}-${random}`;
}

/**
 * Generate a unique order number
 * @returns {string} Order number in format ORD-YYYYMMDD-XXX
 */
function generateOrderNumber() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${dateStr}-${randomSuffix}`;
}

/**
 * Find customer by email or create a new one
 * @param {object} customerData Customer information
 * @returns {Promise<object>} Customer database record
 */
async function findOrCreateCustomer(customerData) {
  const client = await pool.connect();
  
  try {
    // Check if customer exists
    const findQuery = 'SELECT * FROM customers WHERE email = $1 LIMIT 1';
    const { rows } = await client.query(findQuery, [customerData.email]);
    
    if (rows.length > 0) {
      console.log(`Found existing customer with ID ${rows[0].id}`);
      return rows[0];
    }
    
    // Create new customer
    const createQuery = `
      INSERT INTO customers (
        name, 
        email, 
        password,
        phone,
        address,
        city,
        payout_method,
        iban,
        country,
        role,
        created_at,
        updated_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `;
    
    const insertResult = await client.query(createQuery, [
      customerData.name,
      customerData.email,
      "temppassword123", // Default password for form submissions
      customerData.phone || null,
      customerData.address || null,
      customerData.city || null,
      customerData.state || null, // Repurposed as payoutMethod
      customerData.postalCode || null, // Repurposed as iban
      customerData.country || "NL",
      "customer" // Role is always "customer" for consignors
    ]);
    
    const newCustomer = insertResult.rows[0];
    console.log(`Created new customer with ID ${newCustomer.id}`);
    return newCustomer;
  } finally {
    client.release();
  }
}

/**
 * Find open order for customer or create a new one
 * @param {number} customerId Customer ID
 * @returns {Promise<object>} Order database record
 */
async function findOrCreateOrder(customerId) {
  const client = await pool.connect();
  
  try {
    // Check for existing open order
    const findQuery = `
      SELECT * FROM orders 
      WHERE customer_id = $1 AND status = $2 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const { rows } = await client.query(findQuery, [customerId, 'Awaiting Shipment']);
    
    if (rows.length > 0) {
      console.log(`Found existing order with ID ${rows[0].id}`);
      return rows[0];
    }
    
    // Create new order
    const orderNumber = generateOrderNumber();
    
    const createQuery = `
      INSERT INTO orders (
        order_number, 
        customer_id, 
        status, 
        submission_date, 
        total_value, 
        total_payout,
        created_at,
        updated_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;
    
    const insertResult = await client.query(createQuery, [
      orderNumber,
      customerId,
      'Awaiting Shipment',
      new Date(),
      0, // total_value
      0  // total_payout
    ]);
    
    const newOrder = insertResult.rows[0];
    console.log(`Created new order with ID ${newOrder.id} and number ${newOrder.order_number}`);
    return newOrder;
  } finally {
    client.release();
  }
}

/**
 * Create a new item and save its image
 * @param {number} customerId Customer ID
 * @param {object} itemData Item information
 * @returns {Promise<object>} Item database record
 */
async function createItem(customerId, itemData) {
  const client = await pool.connect();
  
  try {
    // Generate reference ID
    const referenceId = generateReferenceId();
    
    // Create item
    const createQuery = `
      INSERT INTO items (
        reference_id, 
        customer_id, 
        title, 
        description, 
        status, 
        created_at, 
        updated_at
      ) 
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;
    
    const insertResult = await client.query(createQuery, [
      referenceId,
      customerId,
      itemData.title,
      itemData.description || null,
      'pending' // Status is always "pending" for new items
    ]);
    
    const newItem = insertResult.rows[0];
    console.log(`Created item with ID ${newItem.id} and reference ${referenceId}`);
    
    // Store image if provided
    if (itemData.imageBase64) {
      const updateQuery = `
        UPDATE items 
        SET image_url = $1, 
            updated_at = NOW() 
        WHERE id = $2
        RETURNING *
      `;
      
      const updateResult = await client.query(updateQuery, [
        itemData.imageBase64,
        newItem.id
      ]);
      
      console.log(`Updated item ${newItem.id} with image`);
      return updateResult.rows[0];
    }
    
    return newItem;
  } finally {
    client.release();
  }
}

/**
 * Link an item to an order
 * @param {number} orderId Order ID
 * @param {number} itemId Item ID
 * @returns {Promise<boolean>} Success status
 */
async function linkItemToOrder(orderId, itemId) {
  const client = await pool.connect();
  
  try {
    // Check if order_items table exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'order_items'
      )
    `;
    
    const tableCheckResult = await client.query(checkTableQuery);
    const orderItemsTableExists = tableCheckResult.rows[0].exists;
    
    if (orderItemsTableExists) {
      // Link via order_items table
      const linkQuery = `
        INSERT INTO order_items (order_id, item_id, created_at) 
        VALUES ($1, $2, NOW())
        ON CONFLICT (order_id, item_id) DO NOTHING
        RETURNING *
      `;
      
      await client.query(linkQuery, [orderId, itemId]);
      console.log(`Linked item ${itemId} to order ${orderId} via order_items table`);
      return true;
    }
    
    // Check if order_id column exists in items table
    const checkColumnQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'items' AND column_name = 'order_id'
      )
    `;
    
    const columnCheckResult = await client.query(checkColumnQuery);
    const orderIdColumnExists = columnCheckResult.rows[0].exists;
    
    if (orderIdColumnExists) {
      // Update order_id in items table
      const updateQuery = `
        UPDATE items 
        SET order_id = $1, 
            updated_at = NOW() 
        WHERE id = $2
        RETURNING *
      `;
      
      await client.query(updateQuery, [orderId, itemId]);
      console.log(`Updated item ${itemId} with order_id ${orderId}`);
      return true;
    }
    
    console.log('No relationship between items and orders found in schema');
    return false;
  } catch (error) {
    console.error(`Error linking item to order: ${error.message}`);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Process an entire intake submission
 * @param {object} intakeData Intake data from form
 * @returns {Promise<object>} Processing result
 */
async function processIntake(intakeData) {
  try {
    // Find or create customer
    const customer = await findOrCreateCustomer(intakeData.customer);
    
    // Find or create order
    const order = await findOrCreateOrder(customer.id);
    
    // Process all items
    const processedItems = [];
    
    for (const itemData of intakeData.items) {
      try {
        // Create item and store image
        const item = await createItem(customer.id, itemData);
        
        // Link item to order
        await linkItemToOrder(order.id, item.id);
        
        // Add to processed items
        processedItems.push({
          id: item.id,
          referenceId: item.reference_id,
          title: item.title,
          status: item.status
        });
      } catch (itemError) {
        console.error(`Error processing item: ${itemError.message}`);
      }
    }
    
    // Return successful result
    return {
      success: true,
      message: `${processedItems.length} item(s) processed successfully`,
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email
        },
        order: {
          id: order.id,
          orderNumber: order.order_number,
          status: order.status,
          itemCount: processedItems.length
        },
        items: processedItems
      }
    };
  } catch (error) {
    console.error(`Error processing intake: ${error.message}`);
    return {
      success: false,
      message: "Error processing intake",
      error: error.message
    };
  }
}

module.exports = {
  processIntake,
  findOrCreateCustomer,
  findOrCreateOrder,
  createItem,
  linkItemToOrder,
  generateReferenceId,
  generateOrderNumber
};