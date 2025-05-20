/**
 * Dashboard Intake Route
 * This implementation processes consignment item submissions and links them to orders
 */

import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../../storage-supabase';
import { insertItemSchema, insertAnalysisSchema, insertPricingSchema, insertOrderSchema, ItemStatus } from '@shared/schema';
import { Pool } from '@neondatabase/serverless';

const router = Router();

// Define intake request schema
const intakeRequestSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  imageBase64: z.string().min(1, "Image is required")
});

// Import improved reference ID generator
import { generateUniqueReferenceId } from '../../utils/reference-generator';

// Helper function to generate a unique reference ID
function generateReferenceId(): string {
  // Use the improved generator to avoid duplicate reference IDs
  return generateUniqueReferenceId();
}

// Helper function to generate a unique order number
function generateOrderNumber(): string {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${dateStr}-${randomSuffix}`;
}

// Helper to calculate commission rate and payout value
function calculateCommissionAndPayout(estimatedValue: number): {
  commissionRate: number;
  payoutValue: number;
} {
  // Default to 30% commission rate
  const commissionRate = 30;
  // Calculate payout as 70% of estimated value
  const payoutValue = estimatedValue * (1 - commissionRate / 100);
  
  return { commissionRate, payoutValue };
}

// POST /api/dashboard/intake - Submit a new item with proper order linking
router.post('/intake', async (req, res) => {
  try {
    console.log('Received dashboard intake request');
    
    // Extract customer ID from authenticated session or JWT token
    const customerId = req.user?.id || 
                       (req.isAuthenticated() && req.session?.passport?.user) || 
                       (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') && 
                        JSON.parse(Buffer.from(req.headers.authorization.split(' ')[1].split('.')[1], 'base64').toString()).id);
    
    if (!customerId) {
      console.log('No customer ID found in session or token');
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required: You must be logged in to submit items" 
      });
    }
    
    console.log(`Processing intake for customer ID: ${customerId}`);
    
    // Validate request body
    const validationResult = intakeRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.log('Validation failed:', validationResult.error.errors);
      return res.status(400).json({ 
        success: false,
        message: "Invalid request data",
        errors: validationResult.error.errors
      });
    }
    
    const { title, description, imageBase64 } = validationResult.data;
    
    // Use a database transaction to ensure all operations succeed or fail together
    const client = await storage.getClient();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // We'll use the numeric customer ID from the authentication
      console.log(`Using customer identifier: ${customerId}`);
      
      // 2. Create a new order in the orders table
      const orderNumber = generateOrderNumber();
      let orderId;
      
      try {
        // Set default estimated values
        const defaultEstimatedValue = 5000; // €50.00
        const { commissionRate, payoutValue } = calculateCommissionAndPayout(defaultEstimatedValue);
        
        // Use the existing orders table
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
        
        const orderInsertResult = await client.query(createOrderQuery, [
          orderNumber,
          customerId,
          'awaiting_shipment',
          defaultEstimatedValue,
          payoutValue
        ]);
        
        orderId = orderInsertResult.rows[0].id;
        console.log(`Created order with ID ${orderId}`);
      } catch (createOrderError) {
        console.error('Error creating order:', createOrderError);
        throw createOrderError;
      }
      
      // 3. Create the item
      let itemId;
      const referenceId = generateReferenceId();
      
      try {
        // Set default value estimates
        const estimatedValue = 5000; // €50.00
        const { commissionRate, payoutValue } = calculateCommissionAndPayout(estimatedValue);
        
        // We've analyzed the items table structure and confirmed it doesn't have an order_id column
        // Use the proper structure based on the actual database tables
        const createItemQuery = `
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
        
        // Process image data and store it as JSON string
        const imageUrls = imageBase64 ? JSON.stringify([imageBase64.substring(0, 100) + '...']) : '[]';
        
        const itemParams = [
          referenceId,
          customerId,
          title,
          description || null,
          'pending',
          imageUrls
        ];
        
        const itemInsertResult = await client.query(createItemQuery, itemParams);
        itemId = itemInsertResult.rows[0].id;
        console.log(`Created item with ID ${itemId}`);
        
        // Always create an entry in order_items junction table to ensure the link exists
        const linkQuery = `
          INSERT INTO order_items (order_id, item_id, created_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (order_id, item_id) DO NOTHING
        `;
        
        await client.query(linkQuery, [orderId, itemId]);
        console.log(`Linked item to order in order_items table`);
      
      } catch (createItemError) {
        console.error('Error creating item:', createItemError);
        throw createItemError;
      }
      
      // 4. Update the order's total values based on the items
      try {
        // First check which tables we're using
        const tablesCheckQuery = `
          SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'new_orders') as has_new_orders,
                 EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') as has_orders
        `;
        
        const tablesExist = await client.query(tablesCheckQuery);
        const hasNewOrders = tablesExist.rows[0].has_new_orders;
        const hasOrders = tablesExist.rows[0].has_orders;
        
        if (hasNewOrders) {
          // Update the new UUID-based orders table
          const updateOrderTotalsQuery = `
            UPDATE new_orders
            SET 
              total_estimated_value = (
                SELECT SUM(estimated_value) 
                FROM new_items 
                WHERE order_id = $1
              ),
              total_payout_value = (
                SELECT SUM(payout_value) 
                FROM new_items 
                WHERE order_id = $1
              )
            WHERE id = $1
          `;
          
          await client.query(updateOrderTotalsQuery, [orderId]);
          console.log(`Updated order totals for UUID order ${orderId}`);
        } else if (hasOrders) {
          // Update the legacy orders table
          const updateOrderTotalsQuery = `
            UPDATE orders
            SET 
              total_value = (
                SELECT COALESCE(SUM(p.average_market_price), 0)
                FROM items i
                LEFT JOIN pricing p ON i.id = p.item_id
                WHERE i.id IN (
                  SELECT item_id FROM order_items WHERE order_id = $1
                )
              ),
              total_payout = (
                SELECT COALESCE(SUM(p.suggested_payout), 0)
                FROM items i
                LEFT JOIN pricing p ON i.id = p.item_id
                WHERE i.id IN (
                  SELECT item_id FROM order_items WHERE order_id = $1
                )
              )
            WHERE id = $1
          `;
          
          await client.query(updateOrderTotalsQuery, [orderId]);
          console.log(`Updated order totals for legacy order ${orderId}`);
        }
      } catch (updateTotalsError) {
        console.warn('Non-critical error updating order totals:', updateTotalsError);
        // Continue even if totals update fails
      }
      
      // 5. Commit the transaction
      await client.query('COMMIT');
      
      // Return success response with appropriate structure based on what was created
      return res.json({
        success: true,
        message: "Item submitted and linked to order successfully",
        order_id: orderId,
        item_id: itemId,
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
      
    } catch (dbError) {
      // Any error will trigger a rollback
      await client.query('ROLLBACK');
      console.error('Database error during intake process:', dbError);
      
      return res.status(500).json({ 
        success: false, 
        message: "Database error during item submission",
        error: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error'
      });
    } finally {
      // Always release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('Unexpected error in dashboard intake route:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to process item submission",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;