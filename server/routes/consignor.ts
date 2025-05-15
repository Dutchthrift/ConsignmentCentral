import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { UserRole, items, analyses, pricing, shipping } from "@shared/schema";
import AuthService from "../services/auth.service";
import { db } from "../db";
import { eq } from "drizzle-orm";

const router = Router();
const authService = new AuthService(storage);

// Middleware to check if user is authenticated and is a consignor
const ensureConsignor = async (req: Request, res: Response, next: NextFunction) => {
  // First try JWT token authentication
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
  
  if (token) {
    const decoded = authService.verifyToken(token);
    if (decoded) {
      try {
        // If token is valid, find the customer (not user)
        // This is the key fix - we're checking for customers, not users
        const customer = await storage.getCustomer(decoded.id);
        if (customer) {
          // Set the customer in the request
          req.user = customer;
          
          if (customer.role !== 'consignor') {
            return res.status(403).json({
              success: false,
              message: "Access denied. Consignor role required.",
            });
          }
          
          return next();
        }
      } catch (error) {
        console.error("Error verifying JWT customer:", error);
      }
    }
  }
  
  // Fallback to session-based authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }
  
  // Log the user object to debug the issue
  console.log("User object in ensureConsignor middleware:", req.user);
  
  if (req.user.role !== 'consignor') {
    return res.status(403).json({
      success: false,
      message: "Access denied. Consignor role required.",
    });
  }
  
  next();
};

// GET /api/consignor/dashboard - get the consignor's dashboard data
router.get("/dashboard", (req: Request, res: Response, next: Function) => {
  // Debug session information
  console.log("Dashboard route session info:", {
    hasSession: !!req.session,
    sessionID: req.sessionID,
    isAuthenticated: req.isAuthenticated(),
    userPresent: !!req.user,
    cookies: req.headers.cookie,
    auth: req.headers.authorization,
  });
  
  ensureConsignor(req, res, next);
}, async (req: Request, res: Response) => {
  try {
    // Get logged in customer's data directly
    const customerId = req.user?.id;
    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer not found",
      });
    }
    
    console.log("Found customer ID:", customerId);
    
    // Get customer data and items
    const customer = await storage.getCustomer(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }
    
    const items = await storage.getItemsWithDetailsByCustomerId(customerId);
    
    // Calculate stats ourselves instead of using getConsignorDetails
    const itemStatusCount = {};
    let totalSales = 0;
    
    // Loop through items to calculate stats
    items.forEach(item => {
      // Count items by status
      itemStatusCount[item.status] = (itemStatusCount[item.status] || 0) + 1;
      
      // Add up sales from sold items
      if (item.status === 'sold' && item.pricing && item.pricing.finalSalePrice) {
        totalSales += item.pricing.finalSalePrice;
      }
    });
    
    const stats = {
      totalItems: items.length,
      totalSales: totalSales / 100, // Convert cents to euros
      itemsPerStatus: itemStatusCount
    };
    
    // Calculate pending payout amount
    const pendingPayout = items.reduce((total, item) => {
      // Only include sold items that haven't been paid yet
      if (item.status === "sold" && item.pricing && item.pricing.finalPayout) {
        return total + (item.pricing.finalPayout / 100);
      }
      return total;
    }, 0);
    
    // Format the data for the dashboard
    const formattedItems = items.map((item) => {
      const pricing = item.pricing || { suggestedListingPrice: 0, commissionRate: 0 };
      
      return {
        id: item.id,
        referenceId: item.referenceId,
        title: item.title,
        imageUrl: item.imageUrl || null,
        status: item.status,
        createdAt: item.createdAt || new Date(),
        estimatedPrice: pricing.suggestedListingPrice ? pricing.suggestedListingPrice / 100 : undefined,
        commissionRate: pricing.commissionRate,
        payoutAmount: pricing.finalPayout ? pricing.finalPayout / 100 : undefined,
        payoutType: pricing.payoutType || "cash",
        finalSalePrice: pricing.finalSalePrice ? pricing.finalSalePrice / 100 : undefined,
      };
    });
    
    res.json({
      success: true,
      data: {
        consignor: {
          id: customer.id,
          name: customer.fullName, // Use fullName instead of name
          email: customer.email,
          totalItems: stats.totalItems,
          totalSales: stats.totalSales,
        },
        stats: {
          totalItems: stats.totalItems,
          pendingItems: itemStatusCount["pending"] || 0,
          approvedItems: itemStatusCount["approved"] || 0,
          listedItems: itemStatusCount["listed"] || 0,
          soldItems: itemStatusCount["sold"] || 0,
          rejectedItems: itemStatusCount["rejected"] || 0,
          itemsPerStatus: itemStatusCount,
          totalSales: stats.totalSales,
        },
        items: formattedItems,
        pendingPayout: pendingPayout,
      },
    });
  } catch (error) {
    console.error("Error getting consignor dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving consignor dashboard",
    });
  }
});

// POST /api/consignor/items/:itemId/payout - update payout preference for an item
router.post("/items/:itemId/payout", ensureConsignor, async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    const { payoutType } = req.body;
    
    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID",
      });
    }
    
    if (!req.user?.customerId) {
      return res.status(403).json({
        success: false,
        message: "No linked customer account found",
      });
    }
    
    // Get the item and check ownership
    const item = await storage.getItem(itemId);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }
    
    if (item.customerId !== req.user.customerId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this item",
      });
    }
    
    // Get pricing info
    const pricing = await storage.getPricingByItemId(itemId);
    
    if (!pricing) {
      return res.status(404).json({
        success: false,
        message: "Pricing information not found",
      });
    }
    
    // Update the payout type
    const updatedPricing = await storage.updatePricing(pricing.id, {
      payoutType,
    });
    
    res.json({
      success: true,
      data: {
        payoutType: updatedPricing?.payoutType,
      },
    });
  } catch (error) {
    console.error("Error updating payout preference:", error);
    res.status(500).json({
      success: false,
      message: "Error updating payout preference",
    });
  }
});

// DELETE /api/consignor/items/:itemId - delete a rejected item
router.delete("/items/:itemId", ensureConsignor, async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    
    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID"
      });
    }
    
    // Verify the item exists and belongs to this consignor
    const item = await storage.getItem(itemId);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found"
      });
    }
    
    // Get customer associated with this user
    if (!req.user?.customerId) {
      return res.status(403).json({
        success: false,
        message: "No linked customer account found"
      });
    }
    
    if (item.customerId !== req.user.customerId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this item"
      });
    }
    
    // Verify item is in rejected status
    if (item.status !== ItemStatus.REJECTED) {
      return res.status(400).json({
        success: false,
        message: "Only rejected items can be deleted"
      });
    }
    
    // Delete associated records first (pricing, analysis, shipping)
    const pricingRecord = await storage.getPricingByItemId(item.id);
    if (pricingRecord) {
      await db.delete(pricing).where(eq(pricing.id, pricingRecord.id)).execute();
    }
    
    const analysisRecord = await storage.getAnalysisByItemId(item.id);
    if (analysisRecord) {
      await db.delete(analyses).where(eq(analyses.id, analysisRecord.id)).execute();
    }
    
    const shippingRecord = await storage.getShippingByItemId(item.id);
    if (shippingRecord) {
      await db.delete(shipping).where(eq(shipping.id, shippingRecord.id)).execute();
    }
    
    // Finally delete the item
    await db.delete(items).where(eq(items.id, item.id)).execute();
    
    res.json({
      success: true,
      message: "Item successfully deleted"
    });
  } catch (error) {
    console.error("Error deleting rejected item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete item"
    });
  }
});

export default router;