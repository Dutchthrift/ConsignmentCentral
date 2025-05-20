import { Router, Request, Response } from 'express';
import { Pool } from '@neondatabase/serverless';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

// Database setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

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
      decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'dutch-thrift-secret-key') as any;
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    
    // Extract customer ID
    const customerId = decodedToken.id;
    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Customer ID not found in token' });
    }
    
    console.log(`Processing intake for customer ID: ${customerId}`);
    
    // Get a client from the pool
    const client = await pool.connect();
    
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
      
      // 1. Create the order
      const orderResult = await client.query(
        'INSERT INTO tmp_orders (customer_id, order_number, total_value, payout_value) VALUES ($1, $2, $3, $4) RETURNING id',
        [customerId, orderNumber, estimatedValue, payoutValue]
      );
      
      const orderId = orderResult.rows[0].id;
      console.log(`Created order with ID ${orderId}`);
      
      // 2. Create the item
      const itemResult = await client.query(
        'INSERT INTO tmp_items (reference_id, order_id, customer_id, title, description, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [referenceId, orderId, customerId, title, description || '', imageUrl]
      );
      
      const itemId = itemResult.rows[0].id;
      console.log(`Created item with ID ${itemId}`);
      
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