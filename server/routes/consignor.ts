import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { UserRole, items, analyses, pricing, shipping } from "@shared/schema";
import AuthService from "../services/auth.service";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { getConsignorDashboard } from "../getConsignorDashboard";

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
          return next();
        }
      } catch (error) {
        console.error("Error in consignor JWT auth:", error);
      }
    }
  }
  
  // If JWT auth failed, try session authentication
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ 
      success: false, 
      message: "Authentication required" 
    });
  }
  
  // If we have a req.user from session, make sure it has the right role
  if (req.user.role !== 'consignor') {
    return res.status(403).json({ 
      success: false, 
      message: "Consignor access required" 
    });
  }
  
  next();
};

// Middleware to ensure item ownership by consignor
const requireConsignorOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    if (isNaN(itemId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid item ID" 
      });
    }
    
    const item = await storage.getItem(itemId);
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: "Item not found" 
      });
    }
    
    if (item.customerId !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't have permission to access this item" 
      });
    }
    
    next();
  } catch (error) {
    console.error("Error in ownership check:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error checking item ownership" 
    });
  }
};

// GET /api/consignor/dashboard - Get dashboard data for current consignor
router.get("/dashboard", (req: Request, res: Response, next: Function) => {
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
    
    // Get customer data 
    const customer = await storage.getCustomer(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }
    
    // Use our standalone function to get the dashboard data
    const dashboardData = await getConsignorDashboard(customerId);
    
    // Return the result directly
    return res.json(dashboardData);
  } catch (error) {
    console.error("Error getting consignor dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving consignor dashboard",
      error: error instanceof Error ? error.message : String(error)
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
    const pricingInfo = await storage.getPricingByItemId(itemId);
    if (!pricingInfo) {
      return res.status(404).json({
        success: false,
        message: "Pricing information not found for this item",
      });
    }
    
    // Update payout type
    const updatedPricing = await storage.updatePricing(pricingInfo.id, {
      ...pricingInfo,
      payoutType
    });
    
    res.json({
      success: true,
      data: {
        pricing: updatedPricing,
      }
    });
  } catch (error) {
    console.error("Error updating payout preference:", error);
    res.status(500).json({
      success: false,
      message: "Error updating payout preference",
    });
  }
});

// DELETE /api/consignor/items/:itemId - cancel an item
router.delete("/items/:itemId", ensureConsignor, async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    
    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID",
      });
    }
    
    // Check if user is associated with a customer
    if (!req.user?.id) {
      return res.status(403).json({
        success: false,
        message: "No linked customer account found",
      });
    }
    
    // Get the item 
    const item = await storage.getItem(itemId);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }
    
    // Verify ownership - make sure this customer owns the item
    if (item.customerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to cancel this item",
      });
    }
    
    // Check if item can be cancelled (only pending items)
    if (item.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel an item in ${item.status} status`,
      });
    }
    
    // Update item status to cancelled
    const updatedItem = await storage.updateItem(itemId, {
      ...item,
      status: 'cancelled',
    });
    
    res.json({
      success: true,
      data: {
        item: updatedItem,
      }
    });
  } catch (error) {
    console.error("Error cancelling item:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling item",
    });
  }
});

export default router;