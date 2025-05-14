import type { Express, Request, Response, NextFunction } from "express";
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
import mlTrainingRoutes from "./routes/ml-training";
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

  // ===== API Routes =====
  
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
  
  // Register admin routes
  app.use("/api/admin", adminRoutes);
  
  // Register dashboard routes
  app.use("/api/dashboard", dashboardRoutes);
  
  // Register ML training routes
  app.use("/api/ml", mlTrainingRoutes);

  // ===== INTAKE ROUTES =====
  
  // Process new intake from Shopify form
  app.post("/api/intake", async (req, res) => {
    try {
      const data = intakeFormSchema.parse(req.body);
      
      // Generate reference ID for the item
      const referenceId = generateReferenceId();
      
      // Check if customer exists or create new
      let customer = await storage.getCustomerByEmail(data.customer.email);
      
      if (!customer) {
        // Create new customer
        const newCustomer = insertCustomerSchema.parse({
          name: data.customer.name,
          email: data.customer.email,
          phone: data.customer.phone || null,
          address: data.customer.address || null,
          city: data.customer.city || null,
          state: data.customer.state || null,
          postalCode: data.customer.postalCode || null,
          country: data.customer.country || null
        });
        
        customer = await storage.createCustomer(newCustomer);
      }
      
      // Create new item
      const newItem = insertItemSchema.parse({
        customerId: customer.id, 
        title: data.item.title,
        description: data.item.description || null,
        imageUrl: data.item.imageUrl || null,
        status: ItemStatus.PENDING,
        referenceId
      });
      
      const item = await storage.createItem(newItem);
      
      res.json({
        success: true,
        message: "Item received successfully",
        data: {
          referenceId,
          customerId: customer.id
        }
      });
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
      const analysisResult = await analyzeProduct(imageUrl, title);
      
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
      const searchTerm = `${analysisResult.brand} ${analysisResult.model} ${analysisResult.productType}`;
      const marketData = await getMarketPricing(searchTerm, analysisResult.condition);
      
      // Calculate suggested pricing based on market data
      const pricingResult = calculatePricing(marketData);
      
      // Create pricing record
      const newPricing = insertPricingSchema.parse({
        itemId: item.id,
        averageMarketPrice: marketData.averagePrice,
        suggestedListingPrice: pricingResult.suggestedListingPrice,
        suggestedPayout: pricingResult.suggestedPayout,
        commissionRate: pricingResult.commissionRate
      });
      
      const pricing = await storage.createPricing(newPricing);
      
      // Update item status
      await storage.updateItemStatus(item.id, ItemStatus.ANALYZED);
      
      res.json({
        success: true,
        data: {
          analysis: analysisResult,
          pricing: {
            averageMarketPrice: marketData.averagePrice / 100, // Convert to EUR
            suggestedListingPrice: pricingResult.suggestedListingPrice / 100, // Convert to EUR
            suggestedPayout: pricingResult.suggestedPayout / 100, // Convert to EUR
            commissionRate: pricingResult.commissionRate
          }
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