/**
 * New Dashboard Intake Route
 * A clean implementation of the item intake process without dependency issues
 */

import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../../storage-supabase';
import { insertItemSchema, insertAnalysisSchema, insertPricingSchema, insertOrderSchema, ItemStatus } from '@shared/schema';

const router = Router();

// Define intake request schema
const intakeRequestSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  imageBase64: z.string().min(1, "Image is required")
});

// Helper function to generate a unique reference ID
function generateReferenceId(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `CS-${dateStr}-${random}`;
}

// POST /api/dashboard/intake - Submit a new item
router.post('/intake', async (req, res) => {
  try {
    console.log('Received new dashboard intake request');
    
    // Extract customer ID from authenticated session
    const customerId = req.user?.id || (req.isAuthenticated() && req.session?.passport?.user);
    if (!customerId) {
      console.log('No customer ID found in session');
      return res.status(401).json({ 
        success: false, 
        message: "You must be logged in to submit items" 
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
    
    try {
      // 1. Generate reference ID
      const referenceId = generateReferenceId();
      console.log(`Generated reference ID: ${referenceId}`);
      
      // 2. Check for existing open order
      console.log(`Looking for existing open order for customer ${customerId}`);
      let order = await storage.getOrderByCustomerIdAndStatus(customerId, "Awaiting Shipment");
      
      // 3. If no open order exists, create one
      if (!order) {
        console.log('No open order found, creating new order');
        
        // Generate unique order number
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const orderNumber = `ORD-${dateStr}-${randomSuffix}`;
        
        const newOrder = insertOrderSchema.parse({
          orderNumber,
          customerId: customerId,
          status: "Awaiting Shipment",
          submissionDate: today,
          totalAmount: 0,
          payoutAmount: 0
        });
        
        order = await storage.createOrder(newOrder);
        console.log(`Created new order ${order.id} with number ${orderNumber}`);
      } else {
        console.log(`Found existing order ${order.id} (${order.orderNumber})`);
      }
      
      // 4. Create the item
      console.log(`Creating item with title "${title}" for customer ${customerId}`);
      const newItem = insertItemSchema.parse({
        customerId, 
        title,
        description: description || null,
        status: "pending",
        referenceId
      });
      
      const item = await storage.createItem(newItem);
      console.log(`Item created with ID ${item.id}`);
      
      // 5. Store the image using direct SQL to avoid column name issues
      if (imageBase64) {
        try {
          console.log(`Storing image for item ${item.id}`);
          
          // Get a database client
          const client = await storage.getClient();
          try {
            // Use correct column name "image_url" (singular) as per database schema
            const query = `
              UPDATE items 
              SET image_url = $1, 
                  updated_at = NOW() 
              WHERE id = $2 
              RETURNING *
            `;
            
            await client.query(query, [imageBase64, item.id]);
            console.log(`Image stored successfully for item ${item.id}`);
          } finally {
            client.release();
          }
        } catch (error) {
          console.error(`Error storing image for item ${item.id}:`, error);
          // Continue with the rest of the process even if image storage failed
        }
      }
      
      // 6. Link item to order
      try {
        console.log(`Linking item ${item.id} to order ${order.id}`);
        await storage.addItemToOrder(order.id, item.id);
        console.log(`Item linked to order successfully`);
      } catch (error) {
        console.error(`Error linking item to order:`, error);
      }
      
      // 7. Create default analysis entry
      try {
        console.log(`Creating default analysis for item ${item.id}`);
        
        const defaultAnalysis = insertAnalysisSchema.parse({
          itemId: item.id,
          brand: title.split(' ')[0] || null,
          productType: title,
          model: null,
          condition: 'Good',
          category: 'General',
          analysisSummary: `Analysis pending for ${title}`
        });
        
        await storage.createAnalysis(defaultAnalysis);
        console.log(`Default analysis created for item ${item.id}`);
      } catch (error) {
        console.error(`Error creating analysis for item ${item.id}:`, error);
      }
      
      // 8. Create default pricing entry
      try {
        console.log(`Creating default pricing for item ${item.id}`);
        
        const defaultPricing = insertPricingSchema.parse({
          itemId: item.id,
          averageMarketPrice: 5000, // €50 in cents
          suggestedListingPrice: 5000,
          commissionRate: 50, // 50%
          suggestedPayout: 2500  // €25 in cents
        });
        
        await storage.createPricing(defaultPricing);
        console.log(`Default pricing created for item ${item.id}`);
      } catch (error) {
        console.error(`Error creating pricing for item ${item.id}:`, error);
      }
      
      // 9. Return success response
      return res.json({
        success: true,
        message: "Item submitted and order created successfully",
        item_id: item.id,
        order_id: order.id,
        data: {
          item: {
            id: item.id,
            referenceId,
            title,
            status: ItemStatus.PENDING
          },
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status
          }
        }
      });
      
    } catch (dbError) {
      console.error('Database error during intake process:', dbError);
      return res.status(500).json({ 
        success: false, 
        message: "Database error during item submission",
        error: process.env.NODE_ENV === 'development' ? `Database error: ${dbError.message}` : undefined
      });
    }
  } catch (error) {
    console.error('Unexpected error in dashboard intake route:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to process item submission",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;