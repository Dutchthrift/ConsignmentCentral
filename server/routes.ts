import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  intakeFormSchema, 
  orderWebhookSchema, 
  ItemStatus,
  insertCustomerSchema,
  insertItemSchema,
  insertAnalysisSchema,
  insertPricingSchema,
  insertShippingSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { generateShippingLabel } from "./services/sendcloud.service";
import { analyzeProduct } from "./services/openai.service";
import { getMarketPricing, calculatePricing } from "./services/ebay.service";

// Import route handlers
import adminRoutes from "./routes/admin";
import dashboardRoutes from "./routes/dashboard";
import { calculateCommission, checkEligibility } from "./utils/commission";

// Generate unique reference ID for new items
function generateReferenceId(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `CS-${year}${month}${day}-${random}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Handle validation errors
  const handleValidationError = (err: unknown, res: Response) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: err.errors 
      });
    }
    console.error("Unexpected error:", err);
    return res.status(500).json({ 
      message: "Internal server error" 
    });
  };

  // ===== API Routes =====
  
  // ROOT API route - service health check
  app.get("/api", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "Consignment Platform API is running" 
    });
  });
  
  // Register admin routes
  app.use("/api/admin", adminRoutes);
  
  // Register dashboard routes
  app.use("/api/dashboard", dashboardRoutes);

  // ===== INTAKE ROUTES =====
  
  // Process new intake from Shopify form
  app.post("/api/intake", async (req, res) => {
    try {
      // Validate intake form data
      const formData = intakeFormSchema.parse(req.body);
      
      // Check if customer already exists
      let customer = await storage.getCustomerByEmail(formData.customer.email);
      
      // If not, create new customer
      if (!customer) {
        const customerData = insertCustomerSchema.parse(formData.customer);
        customer = await storage.createCustomer(customerData);
      }
      
      // Create new item record
      const referenceId = generateReferenceId();
      const itemData = insertItemSchema.parse({
        customerId: customer.id,
        referenceId,
        title: formData.item.title,
        description: formData.item.description || "",
        imageUrl: formData.item.imageUrl || "",
        status: ItemStatus.PENDING
      });
      
      const item = await storage.createItem(itemData);
      
      // Start the analysis process if we have image data
      let analysisResult = null;
      let pricingResult = null;
      
      if (formData.item.imageBase64) {
        try {
          // Analyze the image using OpenAI
          const analysis = await analyzeProduct(
            formData.item.title,
            formData.item.description || "",
            formData.item.imageBase64
          );
          
          // Store analysis results
          const analysisData = insertAnalysisSchema.parse({
            itemId: item.id,
            productType: analysis.productType,
            brand: analysis.brand,
            model: analysis.model,
            condition: analysis.condition,
            accessories: analysis.accessories,
            additionalNotes: analysis.additionalNotes
          });
          
          analysisResult = await storage.createAnalysis(analysisData);
          
          // Get market pricing from eBay
          const marketData = await getMarketPricing(
            analysis.productType,
            analysis.brand,
            analysis.model,
            analysis.condition
          );
          
          // Calculate suggested pricing
          const { suggestedPrice, suggestedPayout } = calculatePricing(marketData);
          
          // Store pricing information
          const pricingData = insertPricingSchema.parse({
            itemId: item.id,
            averageMarketPrice: marketData.averagePrice,
            suggestedListingPrice: suggestedPrice,
            suggestedPayout: suggestedPayout
          });
          
          pricingResult = await storage.createPricing(pricingData);
          
          // Update item status to analyzed
          await storage.updateItemStatus(item.id, ItemStatus.ANALYZED);
        } catch (analysisError) {
          console.error("Error during analysis:", analysisError);
          // Continue processing even if analysis fails
        }
      }
      
      // Return the results
      res.status(201).json({
        success: true,
        message: "Intake processed successfully",
        data: {
          referenceId: item.referenceId,
          title: item.title,
          status: item.status,
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email
          },
          analysis: analysisResult,
          pricing: pricingResult ? {
            suggestedPrice: pricingResult.suggestedListingPrice / 100, // Convert cents to dollars
            suggestedPayout: pricingResult.suggestedPayout / 100 // Convert cents to dollars
          } : null
        }
      });
    } catch (err) {
      handleValidationError(err, res);
    }
  });
  
  // ===== LABEL ROUTES =====
  
  // Generate shipping label for an item
  app.post("/api/label", async (req, res) => {
    try {
      // Validate request
      const { referenceId } = req.body;
      
      if (!referenceId) {
        return res.status(400).json({ message: "Reference ID is required" });
      }
      
      // Get item details
      const item = await storage.getItemWithDetailsByReferenceId(referenceId);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      // Check if shipping label already exists
      if (item.shipping) {
        return res.json({
          success: true,
          message: "Shipping label already generated",
          data: {
            labelUrl: item.shipping.labelUrl,
            trackingNumber: item.shipping.trackingNumber,
            carrier: item.shipping.carrier
          }
        });
      }
      
      // Generate shipping label via Sendcloud
      // In a real implementation, this would use actual address data
      const label = await generateShippingLabel(
        {
          name: "Consignment Store",
          address: "123 Main St",
          city: "Anytown",
          state: "CA",
          postalCode: "12345",
          country: "US"
        },
        {
          name: item.customer.name,
          address: item.customer.address || "456 Customer St",
          city: item.customer.city || "Customertown",
          state: item.customer.state || "CA",
          postalCode: item.customer.postalCode || "54321",
          country: item.customer.country
        },
        {
          weight: 1,
          length: 30,
          width: 20,
          height: 10
        }
      );
      
      // Store shipping information
      const shippingData = insertShippingSchema.parse({
        itemId: item.id,
        labelUrl: label.labelUrl,
        trackingNumber: label.trackingNumber,
        carrier: label.carrier
      });
      
      const shipping = await storage.createShipping(shippingData);
      
      // Update item status
      await storage.updateItemStatus(item.id, ItemStatus.SHIPPED);
      
      // Return the label
      res.json({
        success: true,
        message: "Shipping label generated successfully",
        data: {
          labelUrl: shipping.labelUrl,
          trackingNumber: shipping.trackingNumber,
          carrier: shipping.carrier
        }
      });
    } catch (err) {
      handleValidationError(err, res);
    }
  });
  
  // Get shipping label for an item
  app.get("/api/label/:referenceId", async (req, res) => {
    try {
      const { referenceId } = req.params;
      
      // Get item details
      const item = await storage.getItemWithDetailsByReferenceId(referenceId);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      if (!item.shipping) {
        return res.status(404).json({ message: "No shipping label found for this item" });
      }
      
      // Return the label information
      res.json({
        success: true,
        data: {
          labelUrl: item.shipping.labelUrl,
          trackingNumber: item.shipping.trackingNumber,
          carrier: item.shipping.carrier
        }
      });
    } catch (err) {
      handleValidationError(err, res);
    }
  });
  
  // ===== DASHBOARD ROUTES =====
  
  // Get dashboard statistics
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (err) {
      handleValidationError(err, res);
    }
  });
  
  // Get all items for a customer
  app.get("/api/dashboard/:customerId", async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      
      if (isNaN(customerId)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }
      
      // Get customer
      const customer = await storage.getCustomer(customerId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Get all items for the customer
      const items = await storage.getItemsWithDetailsByCustomerId(customerId);
      
      // Format the response
      const formattedItems = items.map(item => ({
        id: item.id,
        referenceId: item.referenceId,
        title: item.title,
        description: item.description,
        imageUrl: item.imageUrl,
        status: item.status,
        createdAt: item.createdAt,
        analysis: item.analysis ? {
          productType: item.analysis.productType,
          brand: item.analysis.brand,
          model: item.analysis.model,
          condition: item.analysis.condition,
          accessories: item.analysis.accessories
        } : null,
        pricing: item.pricing ? {
          estimatedPrice: item.pricing.suggestedListingPrice / 100, // Convert cents to dollars
          payout: item.pricing.suggestedPayout / 100, // Convert cents to dollars
          finalSalePrice: item.pricing.finalSalePrice ? item.pricing.finalSalePrice / 100 : null,
          finalPayout: item.pricing.finalPayout ? item.pricing.finalPayout / 100 : null
        } : null,
        shipping: item.shipping ? {
          labelUrl: item.shipping.labelUrl,
          trackingNumber: item.shipping.trackingNumber,
          carrier: item.shipping.carrier
        } : null
      }));
      
      res.json({
        success: true,
        data: {
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email
          },
          items: formattedItems
        }
      });
    } catch (err) {
      handleValidationError(err, res);
    }
  });
  
  // Get all recent intakes
  app.get("/api/dashboard/items/recent", async (req, res) => {
    try {
      // Get all items
      const items = await storage.getAllItemsWithDetails();
      
      // Sort by creation date (most recent first)
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Take only the most recent items (limit to 10)
      const recentItems = items.slice(0, 10);
      
      // Format the response
      const formattedItems = recentItems.map(item => ({
        id: item.id,
        referenceId: item.referenceId,
        title: item.title,
        description: item.description,
        imageUrl: item.imageUrl,
        status: item.status,
        createdAt: item.createdAt,
        customer: {
          id: item.customer.id,
          name: item.customer.name,
          email: item.customer.email
        },
        analysis: item.analysis ? {
          productType: item.analysis.productType,
          brand: item.analysis.brand,
          model: item.analysis.model,
          condition: item.analysis.condition,
          accessories: item.analysis.accessories
        } : null,
        pricing: item.pricing ? {
          estimatedPrice: item.pricing.suggestedListingPrice / 100, // Convert cents to dollars
          payout: item.pricing.suggestedPayout / 100, // Convert cents to dollars
          finalSalePrice: item.pricing.finalSalePrice ? item.pricing.finalSalePrice / 100 : null,
          finalPayout: item.pricing.finalPayout ? item.pricing.finalPayout / 100 : null
        } : null
      }));
      
      res.json({
        success: true,
        data: formattedItems
      });
    } catch (err) {
      handleValidationError(err, res);
    }
  });
  
  // Get details for a specific item
  app.get("/api/items/:referenceId", async (req, res) => {
    try {
      const { referenceId } = req.params;
      
      // Get item details
      const item = await storage.getItemWithDetailsByReferenceId(referenceId);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      // Format the response
      const formattedItem = {
        id: item.id,
        referenceId: item.referenceId,
        title: item.title,
        description: item.description,
        imageUrl: item.imageUrl,
        status: item.status,
        createdAt: item.createdAt,
        customer: {
          id: item.customer.id,
          name: item.customer.name,
          email: item.customer.email,
          phone: item.customer.phone
        },
        analysis: item.analysis ? {
          productType: item.analysis.productType,
          brand: item.analysis.brand,
          model: item.analysis.model,
          condition: item.analysis.condition,
          accessories: item.analysis.accessories,
          additionalNotes: item.analysis.additionalNotes
        } : null,
        pricing: item.pricing ? {
          averageMarketPrice: item.pricing.averageMarketPrice / 100, // Convert cents to dollars
          suggestedListingPrice: item.pricing.suggestedListingPrice / 100, // Convert cents to dollars
          suggestedPayout: item.pricing.suggestedPayout / 100, // Convert cents to dollars
          finalSalePrice: item.pricing.finalSalePrice ? item.pricing.finalSalePrice / 100 : null,
          finalPayout: item.pricing.finalPayout ? item.pricing.finalPayout / 100 : null
        } : null,
        shipping: item.shipping ? {
          labelUrl: item.shipping.labelUrl,
          trackingNumber: item.shipping.trackingNumber,
          carrier: item.shipping.carrier,
          createdAt: item.shipping.createdAt
        } : null
      };
      
      res.json({
        success: true,
        data: formattedItem
      });
    } catch (err) {
      handleValidationError(err, res);
    }
  });
  
  // ===== WEBHOOK ROUTES =====
  
  // Process order webhook from Shopify
  app.post("/api/webhooks/order", async (req, res) => {
    try {
      // Validate webhook data
      const webhookData = orderWebhookSchema.parse(req.body);
      
      // Process line items to find the consignment item
      let consignmentItemFound = false;
      
      for (const lineItem of webhookData.line_items) {
        // Look for consignment reference ID in the line item properties
        // In a real implementation, this would be a Shopify product metafield or tag
        const referenceIdProperty = lineItem.properties?.find(
          prop => prop.name === "_consignment_ref_id"
        );
        
        if (referenceIdProperty) {
          const referenceId = referenceIdProperty.value;
          
          // Get the item
          const item = await storage.getItemWithDetailsByReferenceId(referenceId);
          
          if (item && item.pricing) {
            // Convert price from string to cents
            const salePrice = Math.round(parseFloat(lineItem.price) * 100);
            const payout = Math.round(salePrice * 0.8); // 80% payout
            
            // Update pricing with final values
            await storage.updatePricing(item.pricing.id, {
              finalSalePrice: salePrice,
              finalPayout: payout
            });
            
            // Update item status to sold
            await storage.updateItemStatus(item.id, ItemStatus.SOLD);
            
            consignmentItemFound = true;
          }
        }
      }
      
      if (!consignmentItemFound) {
        return res.status(200).json({
          success: true,
          message: "Order processed, but no consignment items found"
        });
      }
      
      res.status(200).json({
        success: true,
        message: "Order processed successfully"
      });
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
