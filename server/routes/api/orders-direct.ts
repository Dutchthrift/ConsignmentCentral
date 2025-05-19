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
      const result = await client.query(`
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
      `);
      
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
      // Get the order details
      const orderResult = await client.query(`
        SELECT o.*, c.name as customer_name, c.email as customer_email
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.id = $1
      `, [orderId]);
      
      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Order not found"
        });
      }
      
      const order = orderResult.rows[0];
      
      // Get all items for this order
      const itemsResult = await client.query(`
        SELECT i.*, 
               a.id as analysis_id, a.brand_analysis, a.style_analysis, a.material_analysis,
               p.id as pricing_id, p.suggested_listing_price, p.commission_rate, p.suggested_payout
        FROM order_items oi
        JOIN items i ON oi.item_id = i.id
        LEFT JOIN analysis a ON i.id = a.item_id
        LEFT JOIN pricing p ON i.id = p.item_id
        WHERE oi.order_id = $1
      `, [orderId]);
      
      // Format response with order and items
      const response = {
        ...order,
        items: itemsResult.rows
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