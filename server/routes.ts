import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
// Import the storage implementation
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
  insertShippingSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  OrderStatus
} from "@shared/schema";
import { ZodError } from "zod";
import jwt from "jsonwebtoken";
import { generateShippingLabel } from "./services/sendcloud.service";
import { analyzeProduct } from "./services/openai.service";
import { getMarketPricing, calculatePricing } from "./services/ebay.service";
import SessionService from "./services/session.service";
import insightsRoutes from "./routes/insights.ts";
import { requireAdmin } from "./middleware/auth.middleware";
import authRoutes from "./routes/auth/auth.routes";
import { AuthService } from "./services/auth.service";
import { configureAuth } from "./middleware/auth.middleware";

// Import route handlers
import adminRoutes from "./routes/admin.ts";
import adminAddConsignorRoute from "./routes/admin/add-consignor";
import adminOrdersRoutes from "./routes/admin/orders";
import adminItemsRoutes from "./routes/admin/items"; // Added import for admin items
import adminAuthTestRoutes from "./routes/admin-auth-test"; // Added import for admin auth test
import fixRelationsRoutes from "./routes/admin/fix-relations"; // Fix item-order relationships route
import dashboardRoutes from "./routes/dashboard.ts";
import itemsRoutes from "./routes/items.ts"; // Item details routes
import consignorRoutes from "./routes/consignor.ts";
import consignorOrdersRoutes from "./routes/consignor/orders";
import consignorItemsRoutes from "./routes/consignor/items";
import consignorRegistrationRoutes from "./routes/consignor-registration";
import mlTrainingRoutes from "./routes/ml-training.ts";
import ordersViewRoutes from "./routes/api/orders-view"; // Added direct view access for orders
import ordersDirectRoutes from "./routes/api/orders-direct"; // Added direct orders API
import demoLoginRoutes from "./routes/demo-login"; // Added demo login for when database is unavailable
import { calculateCommission, checkEligibility } from "./utils/commission.ts";

// Import our improved reference ID generator
import { generateUniqueReferenceId } from './utils/reference-generator';

// Generate unique reference ID for new items
function generateReferenceId(): string {
  // Use the improved generator to avoid duplicate reference IDs
  return generateUniqueReferenceId();
}

// Import our new dashboard intake routers
import dashboardIntakeRouter from './routes/api/dashboard-intake.new';
import newIntakeRouter from './routes/api/new-intake';

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

  // Set up auth middleware
  const authService = new AuthService(storage);
  
  // Configure session handling
  const sessionService = new SessionService();
  app.use(sessionService.getSessionMiddleware());
  
  // Set up authentication middleware that adds user data to request
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Add isAuthenticated method to request
    (req as any).isAuthenticated = function() {
      return !!(req.session && req.session.userId && req.session.userType);
    };
    
    // If user is authenticated via session, add user data to request
    if (req.session && req.session.userId && req.session.userType) {
      const userId = req.session.userId;
      const userType = req.session.userType;
      
      // Load user data based on user type
      if (userType === "admin") {
        storage.getAdminUserById(userId)
          .then(admin => {
            if (admin) {
              (req as any).user = {
                ...admin,
                userType: "admin",
                isAdmin: true
              };
            }
            next();
          })
          .catch(() => next());
      } else if (userType === "consignor") {
        storage.getUserById(userId)
          .then(async user => {
            if (user) {
              const customer = await storage.getCustomerByUserId(userId);
              (req as any).user = {
                ...user,
                customer,
                userType: "consignor",
                isAdmin: false
              };
            }
            next();
          })
          .catch(() => next());
      } else {
        next();
      }
    } else {
      // Check for token-based authentication
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        
        try {
          // Verify token
          const decoded = authService.verifyToken(token);
          
          if (decoded) {
            // Attach user info to request
            (req as any).user = decoded;
            
            // Define isAuthenticated method
            (req as any).isAuthenticated = function() { 
              return true; 
            };
          }
        } catch (error) {
          console.error('Token auth failed:', error);
        }
      }
      
      // Auto-authenticate admin endpoints in development mode
      if (process.env.NODE_ENV !== 'production' && 
          (req.path.startsWith('/api/admin') || req.path.startsWith('/api/dashboard'))) {
        (req as any).user = {
          id: 1,
          email: 'admin@dutchthrift.com',
          role: 'admin',
          userType: 'admin',
          isAdmin: true,
          name: 'Admin User'
        };
        
        // Define isAuthenticated function
        (req as any).isAuthenticated = function() { return true; };
        
        console.log('Applied development auth for admin endpoint:', req.path);
      }
      
      next();
    }
  });
  
  // Add a simple admin check endpoint
  app.get('/api/admin/check', (req, res) => {
    if (req.user && (req.user as any).isAdmin) {
      return res.status(200).json({
        success: true,
        message: 'Admin authenticated',
        user: req.user
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated as admin'
      });
    }
  });
  
  // Register our new session-based authentication routes
  app.use('/api/auth', authRoutes);
  
  // Register legacy Supabase authentication routes as fallback
  const supabaseAuthService = registerSupabaseAuthRoutes(app, storage);
  
  // Demo login route - fallback when database is unavailable
  app.post('/api/auth/demo-login', (req, res) => {
    const { email, password } = req.body;
    
    console.log('Demo login attempt:', { email });
    
    // Only allow specific demo credentials
    if (email === 'admin@dutchthrift.com' && password === 'admin123') {
      // Create a JWT token with admin privileges
      const token = jwt.sign(
        { 
          id: 1, 
          email: 'admin@dutchthrift.com', 
          role: 'admin',
          name: 'Admin User',
          isAdmin: true 
        },
        process.env.JWT_SECRET || 'dutch-thrift-secret-key',
        { expiresIn: '7d' }
      );
      
      console.log('Demo admin login successful');
      
      return res.status(200).json({
        success: true,
        data: {
          id: 1,
          email: 'admin@dutchthrift.com',
          role: 'admin',
          name: 'Admin User',
          token
        }
      });
    }
    
    // Demo consignor login
    if (email === 'theooenema@hotmail.com' && password === 'password123') {
      // Create a JWT token for consignor
      const token = jwt.sign(
        { 
          id: 2, 
          email: 'theooenema@hotmail.com', 
          role: 'consignor',
          name: 'Theo Oenema',
          isAdmin: false 
        },
        process.env.JWT_SECRET || 'dutch-thrift-secret-key',
        { expiresIn: '7d' }
      );
      
      console.log('Demo consignor login successful');
      
      return res.status(200).json({
        success: true,
        data: {
          id: 2,
          email: 'theooenema@hotmail.com',
          role: 'consignor',
          name: 'Theo Oenema',
          token
        }
      });
    }
    
    // If credentials don't match, return error
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  });

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
  
  // Removed Supabase integration
  
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
  
  // Register direct orders view route
  app.use('/api/orders-view', ordersViewRoutes);
  
  // Register direct orders API route with item details
  app.use('/api/orders-direct', ordersDirectRoutes);

  // Register consignor items routes
  app.use('/api/consignor/items', consignorItemsRoutes);
  
  // Item detail route for consignors
  app.get('/api/consignor/item/:id', async (req, res) => {
    try {
      // Check for JWT authentication
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }
      
      const token = authHeader.split(' ')[1];
      
      let decodedUser: any;
      
      try {
        decodedUser = jwt.verify(token, process.env.JWT_SECRET || 'dutch-thrift-jwt-secret') as any;
        
        if (!decodedUser || !decodedUser.id) {
          return res.status(401).json({ success: false, message: "Invalid authentication token" });
        }
      } catch (error) {
        console.error("Token verification error:", error);
        return res.status(401).json({ success: false, message: "Invalid authentication token" });
      }
      
      // Find the customer associated with this user
      const customer = await storage.getCustomerByUserId(decodedUser.id);
      
      if (!customer) {
        return res.status(403).json({ success: false, message: "Not registered as a consignor" });
      }
      
      // Get the item
      const item = await storage.getItemWithDetailsByReferenceId(req.params.id);
      
      // Check if item exists and belongs to this consignor
      if (!item || item.customerId !== customer.id) {
        return res.status(403).json({ 
          success: false, 
          message: "Item not found or you don't have permission to access it" 
        });
      }
      
      res.json({ success: true, data: item });
      
    } catch (error) {
      console.error("Error accessing consignor item:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // ===== ITEM ROUTES =====
  
  // Get an item by its reference ID with detailed info including pricing
  app.get("/api/items/:referenceId", async (req, res) => {
    try {
      const { referenceId } = req.params;
      
      // Use our direct SQL query function for reliability
      const { getItemDetailsByReferenceId } = await import('./getConsignorItems');
      const item = await getItemDetailsByReferenceId(referenceId);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found"
        });
      }
      
      res.json({
        success: true,
        data: item
      });
    } catch (err) {
      console.error("Error getting item details:", err);
      res.status(500).json({
        success: false,
        message: "Error retrieving item details"
      });
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
      const itemIds = []; // Track item IDs for the order
      
      for (const itemData of data.items) {
        // Generate reference ID for the item
        const referenceId = generateReferenceId();
        
        // Create new item - Don't include imageUrl in initial creation
        const newItem = insertItemSchema.parse({
          customerId: customer.id, 
          title: itemData.title,
          description: itemData.description || null,
          status: ItemStatus.PENDING,
          referenceId
        });
        
        const item = await storage.createItem(newItem);
        
        // Get the image data from either the images array or the imageBase64 field
        let imageBase64 = null;
        
        if (itemData.imageBase64) {
          // First check for direct imageBase64 property (new format from storefront)
          imageBase64 = itemData.imageBase64;
        } else if (itemData.images && itemData.images.length > 0) {
          // Fall back to images array if available (legacy format)
          imageBase64 = itemData.images[0];
        }
        
        // Log the beginning of image processing
        console.log(`Processing item "${itemData.title}" with reference ID ${referenceId}`);
        console.log(`Image data available: ${imageBase64 ? 'Yes' : 'No'}`);
        
        if (imageBase64) {
          try {
            // Update the item's image URL using direct SQL with the correct column name
            console.log(`Updating image for item ID ${item.id}`);
            
            // Direct SQL approach to update the image
            const client = await storage.getClient();
            try {
              // Fix SQL query - check if both columns exist first
              console.log('Checking if both image columns exist before update...');
              const checkColumnsQuery = `
                SELECT 
                  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='image_url') as has_image_url,
                  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='image_urls') as has_image_urls
              `;
              
              const columnCheck = await client.query(checkColumnsQuery);
              const hasImageUrl = columnCheck.rows[0].has_image_url;
              const hasImageUrls = columnCheck.rows[0].has_image_urls;
              
              console.log(`Column check results: image_url=${hasImageUrl}, image_urls=${hasImageUrls}`);
              
              // Create a dynamic query based on which columns exist
              let query = `UPDATE items SET updated_at = NOW()`;
              const queryParams = [];
              
              if (hasImageUrl) {
                queryParams.push(imageBase64);
                query += `, image_url = $${queryParams.length}`;
              }
              
              if (hasImageUrls) {
                queryParams.push(imageBase64);
                query += `, image_urls = $${queryParams.length}`;
              }
              
              // Add the item ID parameter
              queryParams.push(item.id);
              query += ` WHERE id = $${queryParams.length} RETURNING *`;
              
              console.log(`Generated SQL query: ${query}`);
              console.log(`With params: [image binary data..., ${item.id}]`);
              
              // Log the query and parameters for debugging
              console.log(`Executing image update with query: ${query}`);
              console.log(`Parameters count: ${queryParams.length}`);
              
              const result = await client.query(query, queryParams);
              console.log(`Image stored successfully for item ${item.id}`);
            } finally {
              client.release();
            }
            
            // Analyze the item with OpenAI
            console.log(`Starting AI analysis for item ${item.id}: ${itemData.title}`);
            const analysisResult = await analyzeProduct(
              itemData.title,
              itemData.description || "",
              imageBase64
            );
            
            // Log the full analysis result for debugging
            console.log('AI analysis result:', JSON.stringify(analysisResult, null, 2));

            try {
              // Create analysis record with complete field mapping
              const newAnalysis = {
                itemId: item.id,
                brand: analysisResult.brand || null,
                productType: analysisResult.productType || null,
                model: analysisResult.model || null,
                condition: analysisResult.condition || null,
                category: analysisResult.category || null,
                accessories: analysisResult.accessories || null,
                analysisSummary: analysisResult.analysisSummary || null,
                additionalNotes: analysisResult.additionalNotes || null,
                features: analysisResult.features ? JSON.stringify(analysisResult.features) : null,
                manufactureYear: analysisResult.manufactureYear || null,
                color: analysisResult.color || null,
                dimensions: analysisResult.dimensions || null,
                weight: analysisResult.weight || null,
                materials: analysisResult.materials || null,
                authenticity: analysisResult.authenticity || null,
                rarity: analysisResult.rarity || null,
                confidenceScore: analysisResult.confidenceScore ? parseFloat(analysisResult.confidenceScore) : null
              };
              
              console.log('Storing analysis in database:', JSON.stringify(newAnalysis, null, 2));
              
              // Parse the analysis data to ensure it matches the schema
              const validatedAnalysis = insertAnalysisSchema.parse(newAnalysis);
              
              // Store analysis in the database with error handling
              try {
                const analysis = await storage.createAnalysis(validatedAnalysis);
                console.log(`Analysis stored successfully for item ${item.id}`);
              } catch (analysisError) {
                console.error(`Error storing analysis for item ${item.id}:`, analysisError);
                // Continue with the process, don't let analysis storage failure stop the item creation
              }
            } catch (schemaError) {
              console.error(`Error validating analysis schema for item ${item.id}:`, schemaError);
              // Continue with the process, don't let analysis validation failure stop the item creation
            }
            
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
                commissionRate: commissionRate,
                payoutType: "cash" // Default to cash payout
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
      
      // Check for existing open order or create a new one for this batch of items
      try {
        console.log(`Processing order for customer ID ${customer.id}`);
        
        // First check if the customer already has an open order with "Awaiting Shipment" status
        let order;
        let orderNumber;
        
        try {
          const existingOrder = await storage.getOrderByCustomerIdAndStatus(customer.id, "Awaiting Shipment");
          
          if (existingOrder) {
            // Use the existing order
            order = existingOrder;
            orderNumber = existingOrder.orderNumber;
            console.log(`Using existing open order ${orderNumber} (ID: ${order.id})`);
          } else {
            // No open order found, create a new one
            console.log("No open order found, creating new order...");
            
            // Generate unique order number in format ORD-YYYYMMDD-XXX
            const today = new Date();
            const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
            const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            orderNumber = `ORD-${dateStr}-${randomSuffix}`;
            
            // Create the order record with standardized status
            const newOrder = insertOrderSchema.parse({
              orderNumber,
              customerId: customer.id,
              status: "Awaiting Shipment", // Use standardized status instead of PENDING
              submissionDate: today,
              // These will be updated later when items are sold
              totalAmount: 0,
              payoutAmount: 0
            });
            
            order = await storage.createOrder(newOrder);
            console.log(`Created new order ${orderNumber} (ID: ${order.id})`);
          }
        } catch (error) {
          // If checking for existing orders fails, create a new one
          console.error("Error checking for existing orders:", error);
          
          // Generate unique order number in format ORD-YYYYMMDD-XXX
          const today = new Date();
          const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
          const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          orderNumber = `ORD-${dateStr}-${randomSuffix}`;
          
          // Create the order record with standardized status
          const newOrder = insertOrderSchema.parse({
            orderNumber,
            customerId: customer.id,
            status: "Awaiting Shipment", // Use standardized status
            submissionDate: today,
            // These will be updated later when items are sold
            totalAmount: 0,
            payoutAmount: 0
          });
          
          order = await storage.createOrder(newOrder);
          console.log(`Created new order ${orderNumber} after error`);
        }
        
        // Add all items to the order
        const orderItems = [];
        for (const itemData of processedItems) {
          const item = await storage.getItemByReferenceId(itemData.referenceId);
          if (item) {
            try {
              await storage.addItemToOrder(order.id, item.id);
              orderItems.push(item);
              console.log(`Added item ${item.id} to order ${order.id}`);
            } catch (error) {
              console.error(`Failed to add item ${item.id} to order ${order.id}:`, error);
            }
          }
        }
        
        // If using legacy format, return single item response
        if (isLegacyFormat && processedItems.length === 1) {
          res.json({
            success: true,
            message: "Item received successfully",
            data: {
              ...processedItems[0],
              orderNumber // Include the order number in the response
            }
          });
        } else {
          // Return response with all items and order info
          res.json({
            success: true,
            message: `${processedItems.length} item(s) received successfully`,
            data: {
              customer: {
                id: customer.id,
                name: customer.name,
                email: customer.email
              },
              order: {
                orderNumber,
                status: order.status || "Awaiting Shipment",
                itemCount: processedItems.length
              },
              items: processedItems
            }
          });
        }
      } catch (orderError) {
        console.error("Error creating order:", orderError);
        
        // If order creation fails, still return the processed items without order info
        if (isLegacyFormat && processedItems.length === 1) {
          res.json({
            success: true,
            message: "Item received successfully, but order creation failed",
            data: processedItems[0]
          });
        } else {
          res.json({
            success: true,
            message: `${processedItems.length} item(s) received successfully, but order creation failed`,
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
      
      // Image URL is now optional - we have fallback logic in the OpenAI service
      
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
        commissionRate: commissionRate,
        payoutType: "cash" // Default to cash payout
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
            commissionRate: commissionRate,
            payoutType: "cash" // Default to cash payout
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

  // Register our new dashboard intake route
  app.use('/api/dashboard-intake', dashboardIntakeRouter);
  
  // Register our new simplified intake route for better reliability
  app.use('/api/new-intake', newIntakeRouter);
  
  // Register our database fix relationships route (admin only)
  app.use('/api/admin/fix-relations', fixRelationsRoutes);
  
  // Serve test page for debugging the intake process
  app.get('/intake-test', (req, res) => {
    const path = require('path');
    res.sendFile(path.join(__dirname, 'intake-test.html'));
  });
  
  // Create HTTP server with the Express app
  return createServer(app);
}