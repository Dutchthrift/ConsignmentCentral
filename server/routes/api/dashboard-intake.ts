/**
 * New Dashboard Intake Route
 * A clean implementation of the item intake process that properly creates orders and links items
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
import { generateUniqueReferenceId } from '../../fix-reference-id.js';

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
      
      // 1. Generate reference ID for item
      const referenceId = generateReferenceId();
      console.log(`Generated reference ID: ${referenceId}`);
      
      // 2. Check for existing open order
      let orderResult;
      try {
        const orderQuery = `
          SELECT * FROM orders 
          WHERE customer_id = $1 AND status = $2 
          ORDER BY created_at DESC 
          LIMIT 1
        `;
        orderResult = await client.query(orderQuery, [customerId, 'Awaiting Shipment']);
        console.log(`Found ${orderResult.rowCount} open orders for customer ${customerId}`);
      } catch (orderQueryError) {
        console.error('Error querying existing orders:', orderQueryError);
        throw orderQueryError;
      }
      
      // 3. Create or use existing order
      let orderId, orderNumber;
      
      if (orderResult.rowCount === 0) {
        // No existing open order, create a new one
        console.log('No open order found, creating new order');
        orderNumber = generateOrderNumber();
        
        try {
          const createOrderQuery = `
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
            RETURNING id
          `;
          
          const orderInsertResult = await client.query(createOrderQuery, [
            orderNumber,
            customerId,
            'Awaiting Shipment',
            new Date(),
            0,  // total_value
            0   // total_payout
          ]);
          
          orderId = orderInsertResult.rows[0].id;
          console.log(`Created new order with ID ${orderId} and number ${orderNumber}`);
        } catch (createOrderError) {
          console.error('Error creating order:', createOrderError);
          throw createOrderError;
        }
      } else {
        // Use existing order
        orderId = orderResult.rows[0].id;
        orderNumber = orderResult.rows[0].order_number;
        console.log(`Using existing order ID: ${orderId}, number: ${orderNumber}`);
      }
      
      // 4. Create the item record
      let itemId;
      try {
        console.log(`Creating item "${title}" with reference ID ${referenceId}`);
        
        const createItemQuery = `
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
          RETURNING id
        `;
        
        const itemInsertResult = await client.query(createItemQuery, [
          referenceId,
          customerId,
          title,
          description || null,
          'pending'
        ]);
        
        itemId = itemInsertResult.rows[0].id;
        console.log(`Created item with ID ${itemId}`);
      } catch (createItemError) {
        console.error('Error creating item:', createItemError);
        throw createItemError;
      }
      
      // 5. Store image using the correct column name from our schema check
      if (imageBase64) {
        try {
          console.log(`Storing image for item ${itemId}`);
          
          const updateImageQuery = `
            UPDATE items 
            SET image_url = $1, 
                updated_at = NOW() 
            WHERE id = $2
          `;
          
          await client.query(updateImageQuery, [imageBase64, itemId]);
          console.log('Image stored successfully');
        } catch (imageError) {
          console.error('Error storing image:', imageError);
          throw imageError;
        }
      }
      
      // 6. Link item to order in the items table
      try {
        console.log(`Linking item ${itemId} to order ${orderId}`);
        
        // Check if the order_id column exists in the items table
        const checkColumnQuery = `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'items' AND column_name = 'order_id'
        `;
        
        const columnCheckResult = await client.query(checkColumnQuery);
        
        if (columnCheckResult.rowCount > 0) {
          // If order_id column exists, update it directly
          const updateOrderIdQuery = `
            UPDATE items 
            SET order_id = $1, 
                updated_at = NOW() 
            WHERE id = $2
          `;
          
          await client.query(updateOrderIdQuery, [orderId, itemId]);
          console.log(`Updated order_id in items table`);
        } else {
          // If order_id column doesn't exist, use the order_items join table
          const linkItemToOrderQuery = `
            INSERT INTO order_items (order_id, item_id, created_at) 
            VALUES ($1, $2, NOW())
            ON CONFLICT (order_id, item_id) DO NOTHING
          `;
          
          await client.query(linkItemToOrderQuery, [orderId, itemId]);
          console.log(`Linked item to order in order_items table`);
        }
      } catch (linkError) {
        console.error('Error linking item to order:', linkError);
        throw linkError;
      }
      
      // 7. Create default analysis entry if analysis table exists
      try {
        const checkAnalysisTableQuery = `
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'analysis'
          )
        `;
        
        const analysisTableExists = await client.query(checkAnalysisTableQuery);
        
        if (analysisTableExists.rows[0].exists) {
          console.log('Creating default analysis');
          
          const createAnalysisQuery = `
            INSERT INTO analysis (
              item_id, 
              brand, 
              product_type, 
              model, 
              condition, 
              category,
              analysis_summary,
              created_at
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          `;
          
          await client.query(createAnalysisQuery, [
            itemId,
            title.split(' ')[0] || null,
            title,
            null,
            'Good',
            'General',
            `Analysis pending for ${title}`
          ]);
          
          console.log(`Created default analysis for item ${itemId}`);
        }
      } catch (analysisError) {
        console.error('Error creating analysis (non-critical):', analysisError);
        // Continue even if analysis creation fails
      }
      
      // 8. Create default pricing entry if pricing table exists
      try {
        const checkPricingTableQuery = `
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'pricing'
          )
        `;
        
        const pricingTableExists = await client.query(checkPricingTableQuery);
        
        if (pricingTableExists.rows[0].exists) {
          console.log('Creating default pricing');
          
          const createPricingQuery = `
            INSERT INTO pricing (
              item_id, 
              average_market_price, 
              suggested_listing_price, 
              commission_rate, 
              suggested_payout,
              created_at
            ) 
            VALUES ($1, $2, $3, $4, $5, NOW())
          `;
          
          await client.query(createPricingQuery, [
            itemId,
            5000, // €50 in cents
            5000,
            50,   // 50% commission
            2500  // €25 in cents
          ]);
          
          console.log(`Created default pricing for item ${itemId}`);
        }
      } catch (pricingError) {
        console.error('Error creating pricing (non-critical):', pricingError);
        // Continue even if pricing creation fails
      }
      
      // 9. Commit the transaction
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
            orderNumber: orderNumber,
            status: 'Awaiting Shipment'
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