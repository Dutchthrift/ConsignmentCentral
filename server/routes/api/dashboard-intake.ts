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

// Helper function to generate a truly unique order number
function generateOrderNumber(): string {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Add timestamp (milliseconds) for better uniqueness
  const timestamp = Date.now().toString().slice(-6);
  
  // Add random component for additional uniqueness
  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `ORD-${dateStr}-${timestamp}-${randomSuffix}`;
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
        // Check if submission_date column exists in orders table
        const checkOrderColumnQuery = `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'orders' AND column_name = 'submission_date'
        `;
        
        const orderColumnCheck = await client.query(checkOrderColumnQuery);
        const submissionDateExists = orderColumnCheck.rows.length > 0;
        
        if (!submissionDateExists) {
          console.log('Adding submission_date column to orders table...');
          // Add the submission_date column if it doesn't exist
          const addOrderColumnQuery = `
            ALTER TABLE orders 
            ADD COLUMN submission_date TIMESTAMP DEFAULT NOW()
          `;
          await client.query(addOrderColumnQuery);
          console.log('Successfully added submission_date column to orders table');
        }
        
        // Check if other required columns exist
        const checkTotalColumns = `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'orders' AND column_name IN ('total_value', 'total_payout')
        `;
        
        const totalColumnsCheck = await client.query(checkTotalColumns);
        const existingColumns = totalColumnsCheck.rows.map(row => row.column_name);
        
        if (!existingColumns.includes('total_value')) {
          console.log('Adding total_value column to orders table...');
          await client.query(`ALTER TABLE orders ADD COLUMN total_value INTEGER DEFAULT 0`);
        }
        
        if (!existingColumns.includes('total_payout')) {
          console.log('Adding total_payout column to orders table...');
          await client.query(`ALTER TABLE orders ADD COLUMN total_payout INTEGER DEFAULT 0`);
        }
        
        // Set default estimated values
        const defaultEstimatedValue = 5000; // €50.00
        const { commissionRate, payoutValue } = calculateCommissionAndPayout(defaultEstimatedValue);
        
        // Use the existing orders table but with a more resilient query
        const createOrderQuery = `
          INSERT INTO orders (
            order_number,
            customer_id,
            status,
            created_at,
            updated_at
            ${submissionDateExists ? ', submission_date' : ''}
            ${existingColumns.includes('total_value') ? ', total_value' : ''}
            ${existingColumns.includes('total_payout') ? ', total_payout' : ''}
          )
          VALUES (
            $1, 
            $2, 
            $3, 
            NOW(), 
            NOW()
            ${submissionDateExists ? ', NOW()' : ''}
            ${existingColumns.includes('total_value') ? ', $4' : ''}
            ${existingColumns.includes('total_payout') ? ', $5' : ''}
          )
          RETURNING id
        `;
        
        // Build parameter array dynamically based on which columns exist
        let params = [orderNumber, customerId, 'awaiting_shipment'];
        if (existingColumns.includes('total_value')) {
          params.push(defaultEstimatedValue);
        }
        if (existingColumns.includes('total_payout')) {
          params.push(payoutValue);
        }
        
        console.log('Executing order create query with params:', params);
        const orderInsertResult = await client.query(createOrderQuery, params);
        
        orderId = orderInsertResult.rows[0].id;
        console.log(`Created order with ID ${orderId}`);
      } catch (createOrderError) {
        console.error('Error creating order:', createOrderError);
        throw createOrderError;
      }
      
      // Check if order_id column exists in the items table
      let orderIdColumnExists = false;
      try {
        const checkColumnQuery = `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'items' AND column_name = 'order_id'
        `;
        
        const columnCheck = await client.query(checkColumnQuery);
        orderIdColumnExists = columnCheck.rows.length > 0;
        
        if (!orderIdColumnExists) {
          console.log('Adding order_id column to items table...');
          // Add the order_id column if it doesn't exist
          const addColumnQuery = `
            ALTER TABLE items 
            ADD COLUMN order_id INTEGER REFERENCES orders(id)
          `;
          await client.query(addColumnQuery);
          orderIdColumnExists = true;
          console.log('Successfully added order_id column to items table');
        }
      } catch (columnCheckError) {
        console.error('Error checking or adding order_id column:', columnCheckError);
        // Continue with fallback approach if column check/add fails
      }
  
      // 3. Create the item
      let itemId;
      const referenceId = generateReferenceId();
      
      try {
        // Set default value estimates
        const estimatedValue = 5000; // €50.00
        const { commissionRate, payoutValue } = calculateCommissionAndPayout(estimatedValue);
        
        // Process image data and store it as JSON string
        const imageUrls = imageBase64 ? JSON.stringify([imageBase64.substring(0, 100) + '...']) : '[]';
        
        // Dynamically build the query based on whether order_id column exists
        let createItemQuery;
        let queryParams;
        
        if (orderIdColumnExists) {
          // Use the items table structure WITH order_id
          createItemQuery = `
            INSERT INTO items (
              reference_id,
              customer_id, 
              title, 
              description, 
              status, 
              created_at, 
              updated_at,
              image_urls,
              order_id
            ) 
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6, $7)
            RETURNING id
          `;
          queryParams = [
            referenceId,
            customerId,
            title,
            description || '',
            'pending',
            imageUrls,
            orderId  // Include order_id parameter
          ];
        } else {
          // Fallback to items table structure WITHOUT order_id
          createItemQuery = `
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
          queryParams = [
            referenceId,
            customerId,
            title,
            description || '',
            'pending',
            imageUrls
          ];
        }
        
        // Execute the item creation query with the appropriate parameters
        const itemResult = await client.query(createItemQuery, queryParams);
        itemId = itemResult.rows[0].id;
        
        console.log(`Created item with ID ${itemId} linked to order ${orderId}`);
        
        // We're using the dynamic query approach with queryParams, no additional query needed
        
        // We can still maintain the junction table for backward compatibility
        const linkQuery = `
          INSERT INTO order_items (order_id, item_id, created_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (order_id, item_id) DO NOTHING
        `;
        
        await client.query(linkQuery, [orderId, itemId]);
        console.log(`Also linked item to order in order_items junction table`);
      
      } catch (createItemError) {
        console.error('Error creating item:', createItemError);
        throw createItemError;
      }
      
      // 4. Update the order's total values based on the items
      try {
        // Update the orders table using the junction table relationship
        const updateOrderTotalsQuery = `
          UPDATE orders
          SET 
            total_value = (
              SELECT COALESCE(SUM(p.average_market_price), 0)
              FROM items i
              LEFT JOIN pricing p ON i.id = p.item_id
              JOIN order_items oi ON i.id = oi.item_id
              WHERE oi.order_id = $1
            ),
            total_payout = (
              SELECT COALESCE(SUM(p.suggested_payout), 0)
              FROM items i
              LEFT JOIN pricing p ON i.id = p.item_id
              JOIN order_items oi ON i.id = oi.item_id
              WHERE oi.order_id = $1
            )
          WHERE id = $1
        `;
        
        await client.query(updateOrderTotalsQuery, [orderId]);
        console.log(`Updated order totals for order ${orderId} using direct relationship`);
      } catch (updateTotalsError) {
        console.warn('Non-critical error updating order totals:', updateTotalsError);
        // Continue even if totals update fails
      }
      
      // 5. Verify the order-item relationship in the database
      try {
        // Check if the junction table link was created
        const verifyQuery = `
          SELECT * FROM order_items WHERE order_id = $1 AND item_id = $2
        `;
        const verifyResult = await client.query(verifyQuery, [orderId, itemId]);
        const junctionExists = verifyResult.rows.length > 0;
        
        // Check if the item has the order_id directly
        const verifyItemQuery = `
          SELECT order_id FROM items WHERE id = $1
        `;
        const verifyItemResult = await client.query(verifyItemQuery, [itemId]);
        const directLinkExists = verifyItemResult.rows.length > 0 && 
                               verifyItemResult.rows[0].order_id === orderId;
        
        console.log(`Verification results - Junction link: ${junctionExists ? 'EXISTS' : 'MISSING'}, Direct link: ${directLinkExists ? 'EXISTS' : 'MISSING'}`);
      } catch (verifyError) {
        console.warn('Non-critical verification error:', verifyError);
      }
      
      // 6. Commit the transaction
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