/**
 * This script updates the order API endpoint to use the new SQL function for fetching order details with items
 */

import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

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

async function updateOrderDetailsEndpoint() {
  try {
    // Paths to the API endpoint files
    const adminOrdersPath = path.join(process.cwd(), 'server', 'routes', 'admin', 'orders.ts');
    const consignorOrdersPath = path.join(process.cwd(), 'server', 'routes', 'consignor', 'orders.ts');
    
    // Check if files exist
    if (!fs.existsSync(adminOrdersPath)) {
      console.log(`Admin orders file not found at ${adminOrdersPath}, will look for alternate locations`);
    }
    
    if (!fs.existsSync(consignorOrdersPath)) {
      console.log(`Consignor orders file not found at ${consignorOrdersPath}, will look for alternate locations`);
    }
    
    // Create a simplified version of the order details endpoint in case the files don't exist
    const adminFallbackPath = path.join(process.cwd(), 'server', 'routes', 'admin', 'orders-fallback.ts');
    if (!fs.existsSync(adminFallbackPath)) {
      console.log(`Creating fallback admin orders endpoint at ${adminFallbackPath}`);
      
      // Create the directory if it doesn't exist
      const dir = path.dirname(adminFallbackPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Create the fallback file
      const fallbackContent = `
import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create a router
const router = express.Router();

// Create a PostgreSQL client with pooling support
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Endpoint to get all orders with improved query
router.get("/", async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(\`
        SELECT o.id, o.order_number, o.customer_id, o.status, 
               o.submission_date, o.tracking_code, o.total_value, o.total_payout,
               c.name as customer_name, c.email as customer_email,
               COUNT(oi.item_id) as item_count
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        GROUP BY o.id, o.order_number, o.customer_id, o.status, 
                 o.submission_date, o.tracking_code, o.total_value, o.total_payout,
                 c.name, c.email
        ORDER BY o.submission_date DESC
      \`);
      
      return res.status(200).json({
        success: true,
        data: result.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error connecting to database:", error);
    return res.status(500).json({
      success: false,
      message: "Database error"
    });
  }
});

// Endpoint to get order details by ID with item relationships
router.get("/:id", async (req: Request, res: Response) => {
  const orderId = parseInt(req.params.id);
  
  try {
    const client = await pool.connect();
    try {
      // Use the improved database function to get order with items
      const result = await client.query(\`
        SELECT * FROM get_order_with_items($1)
      \`, [orderId]);
      
      if (!result.rows[0] || !result.rows[0].order_data) {
        return res.status(404).json({
          success: false,
          message: "Order not found"
        });
      }
      
      // Format the response
      const orderData = result.rows[0].order_data;
      const itemsData = result.rows[0].items_data || [];
      
      const response = {
        ...orderData,
        items: itemsData
      };
      
      return res.status(200).json({
        success: true,
        data: response
      });
    } catch (dbError) {
      console.error("Database error getting order details:", dbError);
      return res.status(500).json({
        success: false,
        message: "Database error"
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error connecting to database:", error);
    return res.status(500).json({
      success: false,
      message: "Database connection error"
    });
  }
});

export default router;
`;
      
      fs.writeFileSync(adminFallbackPath, fallbackContent);
      console.log(`Created fallback admin orders endpoint`);
    }
    
    // Create an API endpoint that directly accesses the items for a specific order
    const directOrdersPath = path.join(process.cwd(), 'server', 'routes', 'api', 'orders-direct.ts');
    if (!fs.existsSync(directOrdersPath)) {
      console.log(`Creating direct orders API endpoint at ${directOrdersPath}`);
      
      // Create the directory if it doesn't exist
      const dir = path.dirname(directOrdersPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Create the direct access file
      const directContent = `
import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create a router
const router = express.Router();

// Create a PostgreSQL client with pooling support
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Get all orders with summary information
router.get("/", async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(\`
        SELECT o.id, o.order_number as "orderNumber", o.customer_id as "customerId", 
               o.status, o.submission_date as "submissionDate", 
               o.tracking_code as "trackingCode", 
               o.total_value as "totalValue", o.total_payout as "totalPayout",
               c.name as "customerName", c.email as "customerEmail",
               COUNT(oi.item_id) as "itemCount"
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        GROUP BY o.id, o.order_number, o.customer_id, o.status, 
                 o.submission_date, o.tracking_code, o.total_value, o.total_payout,
                 c.name, c.email
        ORDER BY o.submission_date DESC
      \`);
      
      return res.status(200).json({
        success: true,
        data: result.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error connecting to database:", error);
    return res.status(500).json({
      success: false,
      message: "Database error"
    });
  }
});

// Get details for a specific order with all items
router.get("/:id", async (req: Request, res: Response) => {
  const orderId = parseInt(req.params.id);
  
  try {
    const client = await pool.connect();
    try {
      // Use the database function to get all order details
      const result = await client.query(\`
        SELECT * FROM get_order_with_items($1)
      \`, [orderId]);
      
      if (!result.rows[0] || !result.rows[0].order_data) {
        return res.status(404).json({
          success: false,
          message: "Order not found"
        });
      }
      
      // Format the response
      const orderData = result.rows[0].order_data;
      const itemsData = result.rows[0].items_data || [];
      
      const response = {
        ...orderData,
        items: itemsData
      };
      
      return res.status(200).json({
        success: true,
        data: response
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error connecting to database:", error);
    return res.status(500).json({
      success: false,
      message: "Database connection error"
    });
  }
});

export default router;
`;
      
      fs.writeFileSync(directOrdersPath, directContent);
      console.log(`Created direct orders API endpoint`);
    }
    
    // Update routes.ts file to register the new endpoints
    const routesPath = path.join(process.cwd(), 'server', 'routes.ts');
    
    if (fs.existsSync(routesPath)) {
      let routesContent = fs.readFileSync(routesPath, 'utf8');
      
      // Check if the direct orders endpoint is already registered
      if (!routesContent.includes('ordersDirectRouter')) {
        console.log('Adding direct orders endpoint to routes.ts');
        
        // Add import statement
        if (!routesContent.includes('import ordersDirectRouter')) {
          const importPos = routesContent.lastIndexOf('import');
          let lastImportEnd = routesContent.indexOf(';', importPos);
          if (lastImportEnd === -1) {
            lastImportEnd = routesContent.indexOf('\n', importPos);
          }
          
          const newImport = `\nimport ordersDirectRouter from './routes/api/orders-direct';`;
          routesContent = routesContent.slice(0, lastImportEnd + 1) + newImport + routesContent.slice(lastImportEnd + 1);
        }
        
        // Add router registration
        const appUsePos = routesContent.lastIndexOf('app.use');
        let lastAppUseEnd = routesContent.indexOf(';', appUsePos);
        if (lastAppUseEnd === -1) {
          lastAppUseEnd = routesContent.indexOf('\n', appUsePos);
        }
        
        const newRoute = `\n  app.use('/api/orders-direct', ordersDirectRouter);`;
        routesContent = routesContent.slice(0, lastAppUseEnd + 1) + newRoute + routesContent.slice(lastAppUseEnd + 1);
        
        fs.writeFileSync(routesPath, routesContent);
        console.log('Updated routes.ts with direct orders endpoint');
      }
    } else {
      console.log(`Routes file not found at ${routesPath}`);
    }
    
    // Update the admin orders fallback route if it exists
    if (fs.existsSync(adminFallbackPath)) {
      let adminFallbackContent = fs.readFileSync(adminFallbackPath, 'utf8');
      
      // Check if the route needs updating to use the new database function
      if (!adminFallbackContent.includes('get_order_with_items')) {
        console.log('Updating admin orders fallback route to use new database function');
        
        // Find the single order endpoint and update it
        const singleOrderPos = adminFallbackContent.indexOf('router.get("/:id"');
        if (singleOrderPos !== -1) {
          // Replace the entire endpoint with the improved version
          const endpointStart = adminFallbackContent.indexOf('router.get("/:id"');
          let endpointEnd = adminFallbackContent.indexOf('});', endpointStart);
          endpointEnd = adminFallbackContent.indexOf('})', endpointEnd) + 2;
          
          const newEndpoint = `
// Endpoint to get order details by ID with item relationships
router.get("/:id", async (req: Request, res: Response) => {
  const orderId = parseInt(req.params.id);
  
  try {
    const client = await pool.connect();
    try {
      // Use the improved database function to get order with items
      const result = await client.query(\`
        SELECT * FROM get_order_with_items($1)
      \`, [orderId]);
      
      if (!result.rows[0] || !result.rows[0].order_data) {
        return res.status(404).json({
          success: false,
          message: "Order not found"
        });
      }
      
      // Format the response
      const orderData = result.rows[0].order_data;
      const itemsData = result.rows[0].items_data || [];
      
      const response = {
        ...orderData,
        items: itemsData
      };
      
      return res.status(200).json({
        success: true,
        data: response
      });
    } catch (dbError) {
      console.error("Database error getting order details:", dbError);
      return res.status(500).json({
        success: false,
        message: "Database error"
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error connecting to database:", error);
    return res.status(500).json({
      success: false,
      message: "Database connection error"
    });
  }
});`;
          
          adminFallbackContent = adminFallbackContent.slice(0, endpointStart) + newEndpoint + adminFallbackContent.slice(endpointEnd);
          
          fs.writeFileSync(adminFallbackPath, adminFallbackContent);
          console.log('Updated admin orders fallback endpoint');
        }
      }
    }
    
    console.log('Order endpoint updates completed successfully');
  } catch (error) {
    console.error('Error updating order endpoints:', error);
    throw error;
  }
}

// Execute the function
updateOrderDetailsEndpoint()
  .then(() => {
    console.log('All order endpoint updates completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });