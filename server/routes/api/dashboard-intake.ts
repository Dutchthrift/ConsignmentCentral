/**
 * New Dashboard Intake Route
 * This implementation uses UUID-based new_orders and new_items tables
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
      
      // 1. Generate a UUID for the customer (transform numeric ID to UUID if needed)
      let customerUuid;
      try {
        // Check if we already have a UUID for this customer
        const customerUuidQuery = `
          SELECT id FROM customers_uuid_map
          WHERE numeric_id = $1
        `;
        
        const customerUuidResult = await client.query(customerUuidQuery, [customerId]);
        
        if (customerUuidResult.rowCount > 0) {
          customerUuid = customerUuidResult.rows[0].id;
        } else {
          // Create new UUID mapping for this customer
          const createUuidMappingQuery = `
            INSERT INTO customers_uuid_map (numeric_id, id)
            VALUES ($1, uuid_generate_v4())
            RETURNING id
          `;
          
          // Try to create the mapping table if it doesn't exist
          try {
            await client.query(`
              CREATE TABLE IF NOT EXISTS customers_uuid_map (
                numeric_id INTEGER PRIMARY KEY,
                id UUID NOT NULL DEFAULT uuid_generate_v4()
              )
            `);
            
            const newUuidResult = await client.query(createUuidMappingQuery, [customerId]);
            customerUuid = newUuidResult.rows[0].id;
          } catch (mappingError) {
            console.log('Could not create UUID mapping, using direct conversion');
            // Fallback to using customerId as UUID seed (less ideal but works for demo)
            customerUuid = customerId;
          }
        }
      } catch (uuidError) {
        console.error('Error getting customer UUID:', uuidError);
        // Fallback to using the numeric ID directly
        customerUuid = customerId;
      }
      
      console.log(`Using customer UUID: ${customerUuid}`);
      
      // 2. Create a new order in new_orders
      const orderNumber = generateOrderNumber();
      let orderId;
      
      try {
        // Set default estimated values
        const defaultEstimatedValue = 5000; // €50.00
        const { commissionRate, payoutValue } = calculateCommissionAndPayout(defaultEstimatedValue);
        
        const createOrderQuery = `
          INSERT INTO new_orders (
            customer_id,
            total_estimated_value,
            total_payout_value,
            status
          )
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `;
        
        const orderInsertResult = await client.query(createOrderQuery, [
          customerUuid,
          defaultEstimatedValue,
          payoutValue,
          'awaiting_shipment'
        ]);
        
        orderId = orderInsertResult.rows[0].id;
        console.log(`Created new order with UUID ${orderId}`);
      } catch (createOrderError) {
        console.error('Error creating order:', createOrderError);
        throw createOrderError;
      }
      
      // 3. Create the item in new_items
      let itemId;
      try {
        // Process image URLs - store the base64 image for now
        const imageUrls = imageBase64 ? [`${imageBase64.substring(0, 100)}...`] : [];
        
        // Set default value estimates
        const estimatedValue = 5000; // €50.00
        const { commissionRate, payoutValue } = calculateCommissionAndPayout(estimatedValue);
        
        const createItemQuery = `
          INSERT INTO new_items (
            order_id,
            title,
            image_urls,
            estimated_value,
            payout_value,
            commission_rate,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `;
        
        const itemInsertResult = await client.query(createItemQuery, [
          orderId,
          title,
          imageUrls, // This will handle the array value correctly
          estimatedValue,
          payoutValue,
          commissionRate,
          'quoted'
        ]);
        
        itemId = itemInsertResult.rows[0].id;
        console.log(`Created item with UUID ${itemId}`);
      } catch (createItemError) {
        console.error('Error creating item:', createItemError);
        throw createItemError;
      }
      
      // 4. Update the order's total values based on the items
      try {
        // For now, we'll just use the single item's values
        // In a real scenario, we'd sum all items in the order
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
        console.log(`Updated order totals for order ${orderId}`);
      } catch (updateTotalsError) {
        console.warn('Non-critical error updating order totals:', updateTotalsError);
        // Continue even if totals update fails
      }
      
      // 5. Commit the transaction
      await client.query('COMMIT');
      
      // Return success response
      return res.json({
        success: true,
        message: "Item submitted and linked to order successfully",
        order_id: orderId,
        item_id: itemId,
        data: {
          order: {
            id: orderId,
            orderNumber: orderNumber || 'Generated',
            status: 'awaiting_shipment'
          },
          item: {
            id: itemId,
            referenceId: generateReferenceId(), // Generate a reference ID for display
            title: title,
            status: 'quoted'
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