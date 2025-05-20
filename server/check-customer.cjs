/**
 * This script checks if the test consignor customer exists and creates it if not
 */

require('dotenv').config();
const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function executeQuery(query, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
}

async function checkAndCreateCustomer() {
  try {
    console.log('Checking if test consignor customer exists...');
    
    // Check if customer with email exists (this is the approach we'll use)
    const checkCustomerEmailQuery = `
      SELECT * FROM customers WHERE email = 'theooenema@hotmail.com'
    `;
    
    const emailResult = await executeQuery(checkCustomerEmailQuery);
    
    if (emailResult.rows.length > 0) {
      const customer = emailResult.rows[0];
      console.log('Found customer with email theooenema@hotmail.com:', customer);
      
      // Update our test-intake.cjs script to use this customer ID
      console.log('Use customer ID', customer.id, 'for your test scripts');
      return customer;
    } else {
      console.log('No customer found with email theooenema@hotmail.com. Creating new customer...');
      
      // Create the customer for Theo Oenema with auto-generated ID
      const createCustomerQuery = `
        INSERT INTO customers (
          email, 
          name, 
          role, 
          password, 
          phone, 
          state, 
          postal_code, 
          address, 
          city, 
          country
        )
        VALUES (
          'theooenema@hotmail.com', 
          'Theo Oenema', 
          'customer', 
          'password123', 
          '+31612345678', 
          'Noord-Holland', 
          '1000AA', 
          'Prinsesseweg 79', 
          'Amsterdam', 
          'Netherlands'
        )
        RETURNING *
      `;
      
      const createResult = await executeQuery(createCustomerQuery);
      
      if (createResult.rows.length > 0) {
        console.log('Successfully created test customer:', createResult.rows[0]);
        return createResult.rows[0];
      } else {
        console.log('Customer creation failed');
        return null;
      }
    }
    
    // Also check if the customer is linked to user ID 1
    const checkUserLinkQuery = `
      SELECT * FROM users WHERE id = 1
    `;
    
    const userResult = await executeQuery(checkUserLinkQuery);
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log('Found user ID 1:', user);
      
      // Check if we need to link the user to customer
      if (!user.customer_id) {
        console.log('User has no linked customer. Linking to customer ID 1...');
        
        const linkUserQuery = `
          UPDATE users 
          SET customer_id = 1 
          WHERE id = 1 
          RETURNING *
        `;
        
        const linkResult = await executeQuery(linkUserQuery);
        
        if (linkResult.rows.length > 0) {
          console.log('Successfully linked user to customer:', linkResult.rows[0]);
        } else {
          console.log('Failed to link user to customer');
        }
      } else {
        console.log('User already linked to customer ID:', user.customer_id);
      }
    } else {
      console.log('No user with ID 1 found. Please create the user first.');
    }
  } catch (error) {
    console.error('Error checking/creating customer:', error);
  } finally {
    await pool.end();
  }
}

// Run the check
checkAndCreateCustomer()
  .then(() => console.log('Customer check completed'))
  .catch(err => console.error('Error in customer check:', err));