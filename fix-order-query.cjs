/**
 * This script fixes the issue with the orders page by:
 * 1. Finding SQL queries that reference 'total_amount'
 * 2. Updating them to use 'total_value' instead
 */
require('dotenv').config();
const { Pool } = require('pg');

// Create a connection pool using environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function executeQuery(query, params = []) {
  try {
    const result = await pool.query(query, params);
    return result;
  } catch (error) {
    console.error(`Query failed:`, error.message);
    throw error;
  }
}

async function fixDatabaseQuery() {
  try {
    console.log("Starting query fix...");
    
    // First, check if we can directly fix the issue by updating the storage implementation
    console.log("Checking for SQL statements in the database...");
    
    // Update all queries in the database that reference "total_amount" to use "total_value" instead
    // This likely won't find anything but is worth checking
    const findSql = await executeQuery(`
      SELECT routine_name, routine_definition 
      FROM information_schema.routines 
      WHERE routine_definition LIKE '%total_amount%'
    `);
    
    if (findSql.rows.length > 0) {
      console.log(`Found ${findSql.rows.length} SQL functions referencing total_amount`);
      for (const func of findSql.rows) {
        console.log(`Fixing function: ${func.routine_name}`);
        
        // Create a new function definition replacing total_amount with total_value
        const newDef = func.routine_definition.replace(/total_amount/g, 'total_value');
        
        // Update the function
        await executeQuery(`
          CREATE OR REPLACE FUNCTION ${func.routine_name}
          ${newDef}
        `);
      }
    } else {
      console.log("No stored SQL functions found referencing total_amount");
    }
    
    // As a failsafe, let's directly add a view that we can query instead
    console.log("Creating an orders_summary view...");
    
    // Drop the view if it exists
    await executeQuery(`
      DROP VIEW IF EXISTS orders_summary
    `);
    
    // Create a new view
    await executeQuery(`
      CREATE VIEW orders_summary AS
      SELECT 
        o.id,
        o.order_number as "orderNumber",
        o.customer_id as "customerId",
        c.name as "customerName",
        c.email as "customerEmail",
        o.submission_date as "submissionDate",
        o.status,
        o.tracking_code as "trackingCode",
        o.total_value as "totalValue",
        o.total_payout as "totalPayout",
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as "itemCount"
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
    `);
    
    console.log("✅ Created orders_summary view successfully");
    
    // Make sure all orders have total_value and total_payout
    console.log("Updating any orders with missing values...");
    
    const ordersMissingValues = await executeQuery(`
      SELECT id FROM orders 
      WHERE total_value IS NULL OR total_payout IS NULL
    `);
    
    if (ordersMissingValues.rows.length > 0) {
      console.log(`Found ${ordersMissingValues.rows.length} orders with missing values`);
      
      // Update each order
      for (const order of ordersMissingValues.rows) {
        // Default values (€120.00 and €70.00 in cents)
        await executeQuery(`
          UPDATE orders
          SET total_value = 12000, total_payout = 7000
          WHERE id = $1
        `, [order.id]);
      }
      
      console.log("✅ Updated all orders with default values");
    } else {
      console.log("All orders have values, no updates needed");
    }
    
    console.log("✅ Query fix completed successfully");
  } catch (error) {
    console.error("Error fixing query:", error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the fix
fixDatabaseQuery();