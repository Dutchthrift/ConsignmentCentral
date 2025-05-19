/**
 * Intake Service
 * 
 * Handles the core functionality of the item intake process:
 * - Image storage
 * - AI analysis
 * - Item creation
 * - Order management
 */

import { storage } from '../storage-supabase';
import { insertItemSchema, insertAnalysisSchema, insertPricingSchema, insertOrderSchema } from '@shared/schema';
import { generateReferenceId } from '../utils/reference-generator';
import { analyzeProduct } from '../services/ai-service';

/**
 * Main function to process item intake
 * Takes item details and consignor information and handles the entire intake workflow
 */
export async function processItemIntake(
  customerId: number, 
  itemData: { 
    title: string; 
    description?: string; 
    imageBase64: string;
  }
) {
  try {
    console.log(`Starting intake process for customer ${customerId}`);
    
    // 1. Generate reference ID
    const referenceId = generateReferenceId();
    
    // 2. Create the basic item record
    const newItem = insertItemSchema.parse({
      customerId, 
      title: itemData.title,
      description: itemData.description || null,
      status: "pending",
      referenceId
    });
    
    const item = await storage.createItem(newItem);
    console.log(`Created item ${item.id} with reference ${referenceId}`);
    
    // 3. Process and store the image
    if (itemData.imageBase64) {
      try {
        console.log(`Processing image for item ${item.id}`);
        
        // Direct SQL to update the image as a workaround for column name issues
        const client = await storage.getClient();
        try {
          const query = `
            UPDATE items 
            SET image_urls = $1, 
                updated_at = NOW() 
            WHERE id = $2 
            RETURNING *
          `;
          
          const result = await client.query(query, [itemData.imageBase64, item.id]);
          if (result.rows && result.rows.length > 0) {
            console.log(`Image stored successfully for item ${item.id}`);
          } else {
            console.log(`No rows returned from image update for item ${item.id}`);
          }
        } finally {
          client.release();
        }
      } catch (error) {
        console.error(`Error storing image for item ${item.id}:`, error);
        // Continue with the rest of the process even if image storage failed
      }
    }
    
    // 4. Perform AI analysis
    let analysisResult = null;
    try {
      console.log(`Analyzing item ${item.id} with AI`);
      analysisResult = await analyzeProduct(
        itemData.title,
        itemData.description || "",
        itemData.imageBase64 || ""
      );
      
      // Create analysis record
      if (analysisResult) {
        const newAnalysis = insertAnalysisSchema.parse({
          itemId: item.id,
          brand: analysisResult.brand || null,
          productType: analysisResult.productType || null,
          model: analysisResult.model || null,
          condition: analysisResult.condition || null,
          category: analysisResult.category || null,
          features: analysisResult.features || null,
          accessories: analysisResult.accessories || null,
          manufactureYear: analysisResult.manufactureYear || null,
          color: analysisResult.color || null,
          dimensions: analysisResult.dimensions || null,
          weight: analysisResult.weight || null,
          materials: analysisResult.materials || null,
          authenticity: analysisResult.authenticity || null,
          rarity: analysisResult.rarity || null,
          additionalNotes: analysisResult.additionalNotes || null,
          analysisSummary: analysisResult.analysisSummary || null,
          confidenceScore: analysisResult.confidenceScore || null
        });
        
        await storage.createAnalysis(newAnalysis);
        console.log(`Analysis saved for item ${item.id}`);
      }
    } catch (error) {
      console.error(`Error during AI analysis for item ${item.id}:`, error);
      // Continue with the rest of the process even if AI analysis failed
    }
    
    // 5. Create pricing information
    try {
      console.log(`Creating pricing information for item ${item.id}`);
      
      // Default values if AI analysis failed
      const marketPrice = analysisResult?.averageMarketPrice || 5000; // €50 in cents
      const listingPrice = analysisResult?.suggestedListingPrice || 5000; // €50 in cents
      
      // Calculate commission rate based on listing price
      let commissionRate = 50; // Default 50%
      
      if (listingPrice >= 10000) { // €100+
        commissionRate = 40;
      }
      if (listingPrice >= 25000) { // €250+
        commissionRate = 30;
      }
      if (listingPrice >= 50000) { // €500+
        commissionRate = 25;
      }
      
      // Calculate payout
      const suggestedPayout = Math.floor(listingPrice * (100 - commissionRate) / 100);
      
      const pricingData = insertPricingSchema.parse({
        itemId: item.id,
        averageMarketPrice: marketPrice,
        suggestedListingPrice: listingPrice,
        commissionRate: commissionRate,
        suggestedPayout: suggestedPayout
      });
      
      await storage.createPricing(pricingData);
      console.log(`Pricing information created for item ${item.id}`);
    } catch (error) {
      console.error(`Error creating pricing for item ${item.id}:`, error);
      // Continue even if pricing creation failed
    }
    
    // 6. Find or create order
    let order;
    try {
      console.log(`Processing order for customer ${customerId}`);
      
      // Check for existing open order
      const existingOrder = await storage.getOrderByCustomerIdAndStatus(customerId, "Awaiting Shipment");
      
      if (existingOrder) {
        // Use existing order
        order = existingOrder;
        console.log(`Using existing order ${order.id} (${order.orderNumber})`);
      } else {
        // Create new order
        console.log(`No open order found, creating new one`);
        
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
        console.log(`Created new order ${order.id} (${orderNumber})`);
      }
      
      // Link item to order
      await storage.addItemToOrder(order.id, item.id);
      console.log(`Item ${item.id} linked to order ${order.id}`);
    } catch (error) {
      console.error(`Error processing order for item ${item.id}:`, error);
    }
    
    // 7. Get the complete item details for response
    const itemWithDetails = await storage.getItemWithDetails(item.id);
    
    // Format response data
    const responseData = {
      success: true,
      message: "Item received successfully",
      data: {
        item: {
          id: item.id,
          referenceId: item.referenceId,
          title: item.title,
          status: item.status,
        },
        analysis: itemWithDetails?.analysis || null,
        pricing: itemWithDetails?.pricing ? {
          estimatedValue: itemWithDetails.pricing.suggestedListingPrice ? 
                          itemWithDetails.pricing.suggestedListingPrice / 100 : 0,
          yourPayout: itemWithDetails.pricing.suggestedPayout ? 
                      itemWithDetails.pricing.suggestedPayout / 100 : 0,
          commissionRate: itemWithDetails.pricing.commissionRate || 0
        } : null,
        order: order ? {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status
        } : null
      }
    };
    
    return responseData;
  } catch (error) {
    console.error("Error in intake process:", error);
    throw error;
  }
}