import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  intakeFormSchema,
  legacyIntakeFormSchema,
  orderWebhookSchema, 
  ItemStatus,
  UserRole,
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
import SessionService from "./services/session.service";
import { registerAuthRoutes } from "./routes/auth.routes";
import insightsRoutes from "./routes/insights.ts";
import { requireAdmin } from "./middleware/auth.middleware";

// Import route handlers
import adminRoutes from "./routes/admin.ts";
import adminAddConsignorRoute from "./routes/admin/add-consignor";
import adminOrdersRoutes from "./routes/admin/orders";
import adminItemsRoutes from "./routes/admin/items"; // Added import for admin items
import adminAuthTestRoutes from "./routes/admin-auth-test"; // Added import for admin auth test
import dashboardRoutes from "./routes/dashboard.ts";
import consignorRoutes from "./routes/consignor.ts";
import consignorOrdersRoutes from "./routes/consignor/orders";
import consignorItemsRoutes from "./routes/consignor/items";
import consignorRegistrationRoutes from "./routes/consignor-registration";
import mlTrainingRoutes from "./routes/ml-training.ts";
import { calculateCommission, checkEligibility } from "./utils/commission.ts";

// Generate unique reference ID for new items
function generateReferenceId(): string {
  const date = new Date();
  const year = date.getFullYear().toString().substring(2);
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

  // Configure session handling
  const sessionService = new SessionService();
  app.use(sessionService.getSessionMiddleware());
  
  // Register authentication routes
  const authService = registerAuthRoutes(app, storage);

  // ===== API Routes =====
  
  // Admin auth test route (public route for debugging only)
  app.use("/api/admin-auth-test", adminAuthTestRoutes);
  
  // ROOT API route - service health check
  app.get("/api", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "Consignment Platform API is running" 
    });
  });
  
  // Test route for OpenAI integration
  app.get("/api/test/openai", (req, res) => {
    if (process.env.OPENAI_API_KEY) {
      res.json({
        status: "ok",
        message: "OpenAI API key is configured",
        keyConfigured: true
      });
    } else {
      res.json({
        status: "warning",
        message: "OpenAI API key is not configured",
        keyConfigured: false
      });
    }
  });
  
  // Register admin routes - protected with admin middleware
  app.use("/api/admin", requireAdmin, adminRoutes);
  
  // Register additional admin routes
  app.use("/api/admin", requireAdmin, adminAddConsignorRoute);
  
  // Register dashboard routes
  app.use("/api/dashboard", dashboardRoutes);
  
  // Register consignor routes
  app.use("/api/consignor", consignorRoutes);
  
  // Only keep the consignor registration route at its original path
  // and don't add the additional admin path which conflicts with adminRoutes
  app.use("/api/consignors", consignorRegistrationRoutes);
  
  // Register ML training routes
  app.use("/api/ml", mlTrainingRoutes);
  
  // Register insights routes
  app.use('/api/insights', insightsRoutes);
  
  // Register admin orders routes
  app.use('/api/admin/orders', requireAdmin, adminOrdersRoutes);
  
  // Register admin items routes
  app.use('/api/admin/items', requireAdmin, adminItemsRoutes);
  
  // Register admin auth test routes (no authentication middleware)
  app.use('/api/admin-auth-test', adminAuthTestRoutes);
  
  // Register consignor orders routes
  app.use('/api/consignor/orders', consignorOrdersRoutes);

  // Register consignor items routes
  app.use('/api/consignor/items', consignorItemsRoutes);

  // ===== ITEM ROUTES =====
  
  // Get an item by its reference ID with detailed info including pricing
  app.get("/api/items/:referenceId", async (req, res) => {
    try {
      const { referenceId } = req.params;
      
      const item = await storage.getItemWithDetailsByReferenceId(referenceId);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found"
        });
      }
      
      // Format the response to include pricing information
      const response = {
        item: {
          id: item.id,
          referenceId: item.referenceId,
          title: item.title,
          description: item.description,
          imageUrl: item.imageUrl,
          status: item.status,
          createdAt: item.createdAt
        },
        customer: {
          id: item.customer.id,
          name: item.customer.name,
          email: item.customer.email
        },
        pricing: item.pricing ? {
          estimatedSalePrice: item.pricing.suggestedListingPrice ? item.pricing.suggestedListingPrice / 100 : 0,
          yourPayout: item.pricing.suggestedPayout ? item.pricing.suggestedPayout / 100 : 0,
          commissionRate: item.pricing.commissionRate || 0
        } : null,
        analysis: item.analysis || null
      };
      
      res.json({
        success: true,
        data: response
      });
    } catch (err) {
      handleValidationError(err, res);
    }
  });
  
  // ===== INTAKE ROUTES =====
  
  // Process new intake from form
  app.post("/api/intake", async (req, res) => {
    try {
      console.log("Received intake form data:", JSON.stringify(req.body));
      
      // Try parsing using the new schema (multiple items)
      let data;
      let isLegacyFormat = false;
      
      try {
        data = intakeFormSchema.parse(req.body);
      } catch (parseError) {
        console.error("Error parsing with intakeFormSchema:", parseError);
        // If that fails, try the legacy schema (single item)
        try {
          const legacyData = legacyIntakeFormSchema.parse(req.body);
          // Convert to new format
          data = {
            customer: legacyData.customer,
            items: [legacyData.item]
          };
          isLegacyFormat = true;
        } catch (legacyParseError) {
          console.error("Error parsing with legacyIntakeFormSchema:", legacyParseError);
          // If both fail, throw the original error
          throw parseError;
        }
      }
      
      // Check if customer exists or create new
      let customer = await storage.getCustomerByEmail(data.customer.email);
      
      if (!customer) {
        // Create new customer - ensure field names match database schema
        const newCustomer = insertCustomerSchema.parse({
          fullName: data.customer.name,
          email: data.customer.email,
          password: "temppassword123", // Default password for form submissions
          phone: data.customer.phone || null,
          address: data.customer.address || null,
          city: data.customer.city || null,
          payoutMethod: data.customer.state || null, // Repurposed as payoutMethod
          iban: data.customer.postalCode || null,    // Repurposed as iban
          country: data.customer.country || "NL",
          role: UserRole.CONSIGNOR
        });
        
        customer = await storage.createCustomer(newCustomer);
      }
      
      // Process all items
      const processedItems = [];
      
      for (const itemData of data.items) {
        // Generate reference ID for the item
        const referenceId = generateReferenceId();
        
        // Create new item
        const newItem = insertItemSchema.parse({
          customerId: customer.id, 
          title: itemData.title,
          description: itemData.description || null,
          imageUrl: null, // Will be updated later if we have an image
          status: ItemStatus.PENDING,
          referenceId
        });
        
        const item = await storage.createItem(newItem);
        
        // If we have images, use the first one and analyze the item immediately
        const imageBase64 = itemData.images && itemData.images.length > 0 ? itemData.images[0] : null;
        
        if (imageBase64) {
          try {
            // Update the item's image URL
            if (storage.updateItemImage) {
              await storage.updateItemImage(item.id, imageBase64);
            }
            
            // Analyze the item with OpenAI
            const analysisResult = await analyzeProduct(
              itemData.title,
              itemData.description || "",
              imageBase64
            );

            // Create analysis record
            const newAnalysis = insertAnalysisSchema.parse({
              itemId: item.id,
              brand: analysisResult.brand,
              productType: analysisResult.productType,
              model: analysisResult.model,
              condition: analysisResult.condition,
              accessories: analysisResult.accessories,
              additionalNotes: analysisResult.additionalNotes
            });
            
            const analysis = await storage.createAnalysis(newAnalysis);
            
            try {
              // Get market pricing from eBay
              const marketData = await getMarketPricing(
                analysisResult.productType,
                analysisResult.brand,
                analysisResult.model,
                analysisResult.condition
              );
              
              // Calculate suggested pricing based on our sliding scale commission model
              // Convert from cents to euros for commission calculation
              const salePrice = marketData.averagePrice / 100;
              const commissionResult = calculateCommission(salePrice);
              
              // Create pricing record regardless of eligibility
              let commissionRate = 30; // Default
              let suggestedPayout = 0;
              
              // If eligible (value €50 or more), calculate regular commission/payout
              if (commissionResult.eligible) {
                commissionRate = commissionResult.commissionRate || 30;
                suggestedPayout = commissionResult.payoutAmount !== undefined
                  ? Math.round(commissionResult.payoutAmount * 100)
                  : Math.round(marketData.averagePrice * (1 - (commissionRate || 30) / 100));
                  
                // For eligible items, keep normal analyzed status
                await storage.updateItemStatus(item.id, ItemStatus.ANALYZED);
              } else {
                // For items below minimum value (€50), mark as rejected
                commissionRate = 100; // 100% commission = no payout
                suggestedPayout = 0;
                
                // Update status to rejected
                await storage.updateItemStatus(item.id, ItemStatus.REJECTED);
              }
              
              const newPricing = insertPricingSchema.parse({
                itemId: item.id,
                averageMarketPrice: marketData.averagePrice,
                suggestedListingPrice: marketData.averagePrice,
                suggestedPayout: suggestedPayout,
                commissionRate: commissionRate,
                payoutType: "cash" // Default to cash payout
              });
              
              const pricing = await storage.createPricing(newPricing);
            } catch (pricingError) {
              console.error("Error during pricing lookup:", pricingError);
              
              // Create fallback pricing with defaults
              const defaultPrice = 10000; // €100.00 in cents
              const commissionRate = 30;
              const suggestedPayout = Math.round(defaultPrice * 0.7); // 70% payout
              
              const fallbackPricing = insertPricingSchema.parse({
                itemId: item.id,
                averageMarketPrice: defaultPrice,
                suggestedListingPrice: defaultPrice,
                suggestedPayout: suggestedPayout,
                commissionRate: commissionRate
              });
              
              await storage.createPricing(fallbackPricing);
            }
            
            // Update item status
            await storage.updateItemStatus(item.id, ItemStatus.ANALYZED);
          } catch (analysisError) {
            console.error("Error during automatic analysis:", analysisError);
            // Continue with the submission even if analysis fails
          }
        }
        
        // Get complete item details with pricing for response
        const itemDetails = await storage.getItemWithDetailsByReferenceId(referenceId);
        
        // Format response for the frontend
        const itemResponseData = {
          referenceId,
          customerId: customer.id,
          title: item.title,
          status: item.status,
          analysis: itemDetails?.analysis || null,
          pricing: itemDetails?.pricing ? {
            estimatedSalePrice: itemDetails.pricing.suggestedListingPrice ? itemDetails.pricing.suggestedListingPrice / 100 : 0,
            yourPayout: itemDetails.pricing.suggestedPayout ? itemDetails.pricing.suggestedPayout / 100 : 0,
            commissionRate: itemDetails.pricing.commissionRate || 0
          } : null
        };
        
        processedItems.push(itemResponseData);
      }
      
      // If using legacy format, return single item response
      if (isLegacyFormat && processedItems.length === 1) {
        res.json({
          success: true,
          message: "Item received successfully",
          data: processedItems[0]
        });
      } else {
        // Return response with all items
        res.json({
          success: true,
          message: `${processedItems.length} item(s) received successfully`,
          data: {
            customer: {
              id: customer.id,
              name: customer.name,
              email: customer.email
            },
            items: processedItems
          }
        });
      }
    } catch (err) {
      handleValidationError(err, res);
    }
  });
  
  // Process image analysis using OpenAI
  app.post("/api/analyze/:referenceId", async (req, res) => {
    try {
      const { referenceId } = req.params;
      const { imageUrl, title } = req.body;
      
      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: "Image URL is required"
        });
      }
      
      // Get the item
      const item = await storage.getItemByReferenceId(referenceId);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found"
        });
      }
      
      // Analyze the item with OpenAI
      const analysisResult = await analyzeProduct(
        title || "",
        "", // description
        imageUrl
      );
      
      // Create analysis record
      const newAnalysis = insertAnalysisSchema.parse({
        itemId: item.id,
        brand: analysisResult.brand,
        productType: analysisResult.productType,
        model: analysisResult.model,
        condition: analysisResult.condition,
        accessories: analysisResult.accessories,
        additionalNotes: analysisResult.additionalNotes
      });
      
      const analysis = await storage.createAnalysis(newAnalysis);
      
      // Get market pricing from eBay
      const marketData = await getMarketPricing(
        analysisResult.productType,
        analysisResult.brand,
        analysisResult.model,
        analysisResult.condition
      );
      
      // Calculate using our commission model with proper euro conversion
      // Convert from cents to euros for commission calculation
      const salePrice = marketData.averagePrice / 100;
      const commissionResult = calculateCommission(salePrice);
      
      let suggestedListingPrice = marketData.averagePrice;
      let suggestedPayout = 0;
      let commissionRate = 30; // Default
      let status = ItemStatus.ANALYZED; // Default status
      
      if (commissionResult.eligible) {
        // For items €50 or above
        commissionRate = commissionResult.commissionRate || 30;
        suggestedPayout = commissionResult.payoutAmount !== undefined
          ? Math.round(commissionResult.payoutAmount * 100)
          : Math.round(marketData.averagePrice * (1 - commissionRate / 100));
        
        status = ItemStatus.ANALYZED;
      } else {
        // For items below €50
        // Set commission to 100% and no payout
        commissionRate = 100;
        suggestedPayout = 0;
        
        // Mark as rejected
        status = ItemStatus.REJECTED;
      }
      
      // Create pricing record
      const newPricing = insertPricingSchema.parse({
        itemId: item.id,
        averageMarketPrice: marketData.averagePrice,
        suggestedListingPrice: suggestedListingPrice,
        suggestedPayout: suggestedPayout,
        commissionRate: commissionRate
      });
      
      const pricing = await storage.createPricing(newPricing);
      
      // Update item status
      await storage.updateItemStatus(item.id, status);
      
      res.json({
        success: true,
        data: {
          analysis: analysisResult,
          pricing: {
            averageMarketPrice: marketData.averagePrice / 100, // Convert to EUR
            suggestedListingPrice: suggestedListingPrice / 100, // Convert to EUR
            suggestedPayout: suggestedPayout / 100, // Convert to EUR
            commissionRate: commissionRate
          }
        }
      });
    } catch (err) {
      handleValidationError(err, res);
    }
  });
  
  // Update item status
  app.put("/api/items/:referenceId/status", async (req, res) => {
    try {
      const { referenceId } = req.params;
      const { status } = req.body;
      
      if (!status || !Object.values(ItemStatus).includes(status as any)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value"
        });
      }
      
      // Get the item
      const item = await storage.getItemByReferenceId(referenceId);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found"
        });
      }
      
      // Update the item status
      const updatedItem = await storage.updateItemStatus(item.id, status);
      
      if (!updatedItem) {
        return res.status(500).json({
          success: false,
          message: "Failed to update item status"
        });
      }
      
      res.json({
        success: true,
        data: {
          id: updatedItem.id,
          referenceId: updatedItem.referenceId,
          status: updatedItem.status
        }
      });
    } catch (err) {
      handleValidationError(err, res);
    }
  });
  
  // Generate shipping label
  app.post("/api/label/:referenceId", async (req, res) => {
    try {
      const { referenceId } = req.params;
      const { 
        fromAddress, 
        toAddress,
        packageDetails 
      } = req.body;
      
      // Validate addresses and package details
      if (!fromAddress || !toAddress || !packageDetails) {
        return res.status(400).json({
          success: false,
          message: "Missing required shipping information"
        });
      }
      
      // Get the item
      const item = await storage.getItemByReferenceId(referenceId);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found"
        });
      }
      
      // Generate label via SendCloud service
      const { labelUrl, trackingNumber, carrier } = await generateShippingLabel(
        fromAddress,
        toAddress,
        packageDetails
      );
      
      // Create shipping record
      const newShipping = insertShippingSchema.parse({
        itemId: item.id,
        labelUrl,
        trackingNumber,
        carrier
      });
      
      const shipping = await storage.createShipping(newShipping);
      
      // Update item status
      await storage.updateItemStatus(item.id, ItemStatus.SHIPPED);
      
      res.json({
        success: true,
        data: {
          labelUrl,
          trackingNumber,
          carrier
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
      
      // Get the item with shipping details
      const item = await storage.getItemWithDetailsByReferenceId(referenceId);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found"
        });
      }
      
      if (!item.shipping) {
        return res.status(404).json({
          success: false,
          message: "Shipping label not found for this item"
        });
      }
      
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
  
  // ===== RECENT ITEMS ROUTES =====
  
  // Get all recent intakes
  app.get("/api/dashboard/items/recent", async (req, res) => {
    try {
      // Get all items
      const items = await storage.getAllItemsWithDetails();
      
      // Sort by creation date, newest first
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Take the 10 most recent items
      const recentItems = items.slice(0, 10).map(item => ({
        referenceId: item.referenceId,
        title: item.title,
        imageUrl: item.imageUrl,
        status: item.status,
        createdAt: item.createdAt,
        pricing: item.pricing ? {
          estimatedPrice: item.pricing.suggestedListingPrice ? item.pricing.suggestedListingPrice / 100 : null,
          payout: item.pricing.suggestedPayout ? item.pricing.suggestedPayout / 100 : null
        } : null
      }));
      
      res.json({
        success: true,
        data: recentItems
      });
    } catch (err) {
      handleValidationError(err, res);
    }
  });
  
  // ===== ITEM DETAILS =====
  
  // Get item details by reference ID
  app.get("/api/items/:referenceId", async (req, res) => {
    try {
      const { referenceId } = req.params;
      
      // Get item with all details
      const item = await storage.getItemWithDetailsByReferenceId(referenceId);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found"
        });
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
          averageMarketPrice: item.pricing.averageMarketPrice ? item.pricing.averageMarketPrice / 100 : null,
          suggestedListingPrice: item.pricing.suggestedListingPrice ? item.pricing.suggestedListingPrice / 100 : null,
          suggestedPayout: item.pricing.suggestedPayout ? item.pricing.suggestedPayout / 100 : null,
          commissionRate: item.pricing.commissionRate,
          finalSalePrice: item.pricing.finalSalePrice ? item.pricing.finalSalePrice / 100 : null,
          finalPayout: item.pricing.finalPayout ? item.pricing.finalPayout / 100 : null,
          payoutType: item.pricing.payoutType
        } : null,
        shipping: item.shipping ? {
          labelUrl: item.shipping.labelUrl,
          trackingNumber: item.shipping.trackingNumber,
          carrier: item.shipping.carrier
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
  
  // ===== ORDER WEBHOOK =====
  
  // Receive order webhook from Shopify
  app.post("/api/orders/webhook", async (req, res) => {
    try {
      const data = orderWebhookSchema.parse(req.body);
      
      // Get the item
      const item = await storage.getItemByReferenceId(data.referenceId);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found"
        });
      }
      
      // Get pricing info
      const pricing = await storage.getPricingByItemId(item.id);
      
      if (!pricing) {
        return res.status(404).json({
          success: false,
          message: "Pricing information not found"
        });
      }
      
      // Calculate final payout based on sale price
      const { payoutAmount, commissionRate } = calculateCommission(
        data.salePrice,
        pricing.payoutType || 'cash'
      );
      
      // Convert to cents
      const finalSalePrice = Math.round(data.salePrice * 100);
      const finalPayout = Math.round(payoutAmount * 100);
      
      // Update pricing with final values
      await storage.updatePricing(pricing.id, {
        finalSalePrice,
        finalPayout,
        commissionRate: commissionRate,
        payoutType: pricing.payoutType || 'cash',
        storeCreditAmount: pricing.payoutType === 'storecredit' ? finalPayout : null
      });
      
      // Update item status
      await storage.updateItemStatus(item.id, ItemStatus.SOLD);
      
      res.json({
        success: true,
        data: {
          referenceId: item.referenceId,
          status: ItemStatus.SOLD,
          salePrice: data.salePrice,
          payout: payoutAmount,
          commissionRate: commissionRate
        }
      });
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  // Create HTTP server with the Express app
  return createServer(app);
}