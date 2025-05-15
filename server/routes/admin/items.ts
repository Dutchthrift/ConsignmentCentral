import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { db } from "../../db";
import { items, pricing, analyses, shipping, customers } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import AuthService from "../../services/auth.service";

const router = Router();
const authService = new AuthService(storage);

// Middleware to check if user is authenticated and is an admin
const requireAdminAuth = async (req: Request, res: Response, next: Function) => {
  try {
    // First try JWT token authentication
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
    
    console.log('Admin JWT Auth attempt - token present:', !!token);
    
    if (token) {
      try {
        const decoded = authService.verifyToken(token);
        console.log('Admin JWT decoded:', decoded);
        
        if (decoded && decoded.id && decoded.role === 'admin') {
          // If token is valid, find the admin user
          const user = await storage.getAdminUserById(decoded.id);
          console.log('Found admin by JWT token:', !!user);
          
          if (user) {
            // Set the admin in the request
            req.user = user;
            return next();
          }
        }
      } catch (error) {
        console.error("Error in admin JWT auth:", error);
      }
    }
    
    // If JWT auth failed, try session authentication
    console.log('Admin session auth check:', {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      role: req.user?.role
    });
    
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(401).json({ 
        success: false, 
        message: "Admin authentication required" 
      });
    }
    
    next();
  } catch (error) {
    console.error("Admin authentication middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Direct SQL query to get all items with related data for admin
async function getAllItems() {
  try {
    // Get all items
    const allItems = await db.select().from(items);
    
    if (!allItems || allItems.length === 0) {
      return {
        success: true,
        data: []
      };
    }
    
    // Get all related data in bulk to minimize database queries
    const itemIds = allItems.map(item => item.id);
    
    // Get pricing data for all items
    let pricingData: typeof pricing.$inferSelect[] = [];
    if (itemIds.length > 0) {
      for (const itemId of itemIds) {
        const data = await db.select().from(pricing).where(eq(pricing.itemId, itemId));
        pricingData = [...pricingData, ...data];
      }
    }
        
    // Get analysis data for all items
    let analysisData: typeof analyses.$inferSelect[] = [];
    if (itemIds.length > 0) {
      for (const itemId of itemIds) {
        const data = await db.select().from(analyses).where(eq(analyses.itemId, itemId));
        analysisData = [...analysisData, ...data];
      }
    }
        
    // Get shipping data for all items
    let shippingData: typeof shipping.$inferSelect[] = [];
    if (itemIds.length > 0) {
      for (const itemId of itemIds) {
        const data = await db.select().from(shipping).where(eq(shipping.itemId, itemId));
        shippingData = [...shippingData, ...data];
      }
    }
    
    // Get all customers for consignor info
    const customerIds = [...new Set(allItems.map(item => item.customerId))];
    let customersData: typeof customers.$inferSelect[] = [];
    if (customerIds.length > 0) {
      for (const customerId of customerIds) {
        const data = await db.select().from(customers).where(eq(customers.id, customerId));
        customersData = [...customersData, ...data];
      }
    }
    
    // Create lookup maps for quick access
    const pricingMap = pricingData.reduce((map, price) => {
      map[price.itemId] = price;
      return map;
    }, {} as Record<number, typeof pricing.$inferSelect>);
    
    const analysisMap = analysisData.reduce((map, analysis) => {
      map[analysis.itemId] = analysis;
      return map;
    }, {} as Record<number, typeof analyses.$inferSelect>);
    
    const shippingMap = shippingData.reduce((map, ship) => {
      map[ship.itemId] = ship;
      return map;
    }, {} as Record<number, typeof shipping.$inferSelect>);
    
    const customerMap = customersData.reduce((map, customer) => {
      map[customer.id] = customer;
      return map;
    }, {} as Record<number, typeof customers.$inferSelect>);
    
    // Format the items with all their relations
    const formattedItems = allItems.map(item => {
      const itemPricing = pricingMap[item.id];
      const itemAnalysis = analysisMap[item.id];
      const itemShipping = shippingMap[item.id];
      const itemCustomer = customerMap[item.customerId];
      
      return {
        id: item.id,
        referenceId: item.referenceId,
        title: item.title,
        description: item.description,
        category: item.category,
        status: item.status,
        imageUrl: item.imageUrl,
        customerId: item.customerId,
        createdAt: item.createdAt ? item.createdAt.toISOString() : null,
        updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
        
        // Customer info
        customer: itemCustomer ? {
          id: itemCustomer.id,
          email: itemCustomer.email,
          fullName: itemCustomer.fullName,
          phone: itemCustomer.phone,
        } : null,
        
        // Pricing details
        pricing: itemPricing ? {
          id: itemPricing.id,
          suggestedListingPrice: itemPricing.suggestedListingPrice,
          commissionRate: itemPricing.commissionRate,
          suggestedPayout: itemPricing.suggestedPayout,
          finalSalePrice: itemPricing.finalSalePrice,
          finalPayout: itemPricing.finalPayout,
          payoutType: itemPricing.payoutType,
        } : null,
        
        // Analysis summary
        analysis: itemAnalysis ? {
          id: itemAnalysis.id,
          // Using item's category if analysis doesn't have it
          category: item.category,
          brand: itemAnalysis.brand,
          condition: itemAnalysis.condition,
          productType: itemAnalysis.productType,
          model: itemAnalysis.model,
          accessories: itemAnalysis.accessories,
          additionalNotes: itemAnalysis.additionalNotes,
          createdAt: itemAnalysis.createdAt ? itemAnalysis.createdAt.toISOString() : null
        } : null,
        
        // Shipping info
        shipping: itemShipping ? {
          id: itemShipping.id,
          trackingNumber: itemShipping.trackingNumber,
          carrier: itemShipping.carrier,
          labelUrl: itemShipping.labelUrl,
          createdAt: itemShipping.createdAt ? itemShipping.createdAt.toISOString() : null
        } : null
      };
    });
    
    return {
      success: true,
      data: formattedItems
    };
  } catch (error) {
    console.error("Error getting all items:", error);
    return {
      success: false,
      message: "Error retrieving items",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Get all items (for admin)
router.get("/", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = await getAllItems();
    return res.json(result);
  } catch (error) {
    console.error("Error fetching admin items:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching items",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get single item by ID (for admin)
router.get("/:itemId", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID"
      });
    }
    
    // Get the item with details
    const item = await storage.getItemWithDetails(itemId);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found"
      });
    }
    
    return res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error("Error fetching item:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching item",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Update item status (for admin)
router.patch("/:itemId/status", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    const { status } = req.body;
    
    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID"
      });
    }
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }
    
    // Update the item status
    const updatedItem = await storage.updateItemStatus(itemId, status);
    
    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        message: "Item not found"
      });
    }
    
    return res.json({
      success: true,
      data: updatedItem
    });
  } catch (error) {
    console.error("Error updating item status:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating item status",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Update item pricing (for admin)
router.patch("/:itemId/pricing", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    const updates = req.body;
    
    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID"
      });
    }
    
    // Get current pricing
    const currentPricing = await storage.getPricingByItemId(itemId);
    
    if (!currentPricing) {
      return res.status(404).json({
        success: false,
        message: "Pricing not found for this item"
      });
    }
    
    // Update the pricing
    const updatedPricing = await storage.updatePricing(currentPricing.id, {
      ...currentPricing,
      ...updates
    });
    
    return res.json({
      success: true,
      data: updatedPricing
    });
  } catch (error) {
    console.error("Error updating item pricing:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating item pricing",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;