import { Router, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { pool, db } from '../../db'; // Import the database pool from our centralized db.ts file

// Initialize environment variables
dotenv.config();

// Define the intake schema
const intakeSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title too long"),
  imageBase64: z.string().min(10, "Image data is required"),
  description: z.string().optional(),
});

// Function to generate a unique order number
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  // Add milliseconds for better uniqueness
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
  
  // Random component (4 digits)
  const random = Math.floor(1000 + Math.random() * 9000);
  
  return `CS-${year}${month}${day}-${milliseconds}-${random}`;
}

// Function to generate a unique reference ID for items
function generateReferenceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `R${timestamp}${random}`;
}

// Calculate commission and payout
function calculateCommissionAndPayout(estimatedValue: number) {
  const commissionRate = 30; // 30% commission
  const payoutValue = Math.floor(estimatedValue * (1 - commissionRate / 100));
  
  return {
    commissionRate,
    payoutValue
  };
}

// Create the router
const router = Router();

/**
 * POST /api/new-intake
 * Process a new item consignment submission
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate the input
    const { title, imageBase64, description } = intakeSchema.parse(req.body);
    
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    let decodedToken;
    
    try {
      // Use the same JWT secret as in auth.service.ts
      decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'dutch-thrift-jwt-secret') as any;
    } catch (err) {
      console.error('Token verification error:', err);
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    
    // Extract user ID from token
    const userId = decodedToken.id;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID not found in token' });
    }
    
    // Find the correct customer ID from the customers table using the email
    const email = decodedToken.email;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email not found in token' });
    }
    
    // Look up the customer ID using email
    const customerResult = await pool.query(
      'SELECT id FROM customers WHERE email = $1',
      [email]
    );
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found with this email' });
    }
    
    const customerId = customerResult.rows[0].id;
    console.log(`Processing intake for user ID: ${userId}, found customer ID: ${customerId}`);
    
    // Use a direct connection pool instead of WebSocket
    let client;
    try {
      client = await pool.connect();
    } catch (err) {
      console.error('Failed to connect to database:', err);
      return res.status(500).json({ success: false, message: 'Failed to connect to database' });
    }
    
    try {
      // Start a transaction
      await client.query('BEGIN');
      
      // Generate unique identifiers
      const orderNumber = generateOrderNumber();
      const referenceId = generateReferenceId();
      
      // Set default value estimates - fixed at €50.00 for now
      const estimatedValue = 5000; // €50.00
      const { commissionRate, payoutValue } = calculateCommissionAndPayout(estimatedValue);
      
      // Process image data properly - store as a plain string URL
      // In a real implementation, you'd upload this to cloud storage and store the URL
      const imageUrl = 'data:image/jpeg;base64,STORED_SEPARATELY';
      
      // 1. Create the order in the main orders table
      const orderResult = await client.query(
        'INSERT INTO orders (customer_id, order_number, status, total_amount, payout_amount) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [customerId, orderNumber, 'awaiting_shipment', estimatedValue, payoutValue]
      );
      
      const orderId = orderResult.rows[0].id;
      console.log(`Created order with ID ${orderId}`);
      
      // 2. Create the item in the main items table
      const itemResult = await client.query(
        'INSERT INTO items (reference_id, customer_id, title, description, image_urls, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [referenceId, customerId, title, description || '', imageUrl, 'pending']
      );
      
      const itemId = itemResult.rows[0].id;
      console.log(`Created item with ID ${itemId}`);
      
      // 3. Connect the item to the order using the order_items junction table
      const orderItemResult = await client.query(
        'INSERT INTO order_items (order_id, item_id) VALUES ($1, $2) RETURNING id',
        [orderId, itemId]
      );
      console.log(`Created order_item relation with ID ${orderItemResult.rows[0].id}`);
      
      // Commit the transaction
      await client.query('COMMIT');
      console.log('Successfully committed transaction');
      
      // Return success response
      return res.status(200).json({
        success: true,
        message: 'Item successfully submitted',
        data: {
          order: {
            id: orderId,
            orderNumber: orderNumber,
            status: 'awaiting_shipment'
          },
          item: {
            id: itemId,
            referenceId: referenceId,
            title: title,
            status: 'pending'
          }
        }
      });
      
    } catch (error) {
      // Rollback the transaction on error
      await client.query('ROLLBACK');
      console.error('Database error during intake process:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Database error during item submission',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      });
      
    } finally {
      // Release the client back to the pool
      client.release();
    }
    
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: error.errors
      });
    }
    
    console.error('Error processing intake:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process item submission'
    });
  }
});

export default router;