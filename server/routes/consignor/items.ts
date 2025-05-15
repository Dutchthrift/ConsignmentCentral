import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { getConsignorItems } from "../../getConsignorItems";
import AuthService from "../../services/auth.service";

const router = Router();
const authService = new AuthService(storage);

// Middleware to check if user is authenticated and is a consignor
const requireConsignorAuth = async (req: Request, res: Response, next: Function) => {
  try {
    // First try JWT token authentication
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
    
    console.log('JWT Auth attempt - token present:', !!token);
    
    if (token) {
      try {
        const decoded = authService.verifyToken(token);
        console.log('JWT decoded:', decoded);
        
        if (decoded && decoded.id) {
          // If token is valid, find the customer
          const customer = await storage.getCustomer(decoded.id);
          console.log('Found customer by JWT token:', !!customer);
          
          if (customer) {
            // Set the customer in the request
            req.user = customer;
            return next();
          }
        }
      } catch (error) {
        console.error("Error in consignor JWT auth:", error);
      }
    }
    
    // If JWT auth failed, try session authentication
    console.log('Session auth check:', {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user
    });
    
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }
    
    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

// Get all items for the current consignor
router.get("/", requireConsignorAuth, async (req: Request, res: Response) => {
  try {
    // Get the customerId directly from the user object
    const customerId = req.user?.id;
    if (!customerId) {
      return res.status(403).json({
        success: false,
        message: "No linked customer account found"
      });
    }
    
    // Use our direct SQL function to get items
    const result = await getConsignorItems(customerId);
    return res.json(result);
  } catch (error) {
    console.error("Error fetching consignor items:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching items",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get single item by ID
router.get("/:itemId", requireConsignorAuth, async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID"
      });
    }
    
    // Get the customerId directly from the user object
    const customerId = req.user?.id;
    if (!customerId) {
      return res.status(403).json({
        success: false,
        message: "No linked customer account found"
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
    
    // Check if this item belongs to the current consignor
    if (item.customerId !== customerId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this item"
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

export default router;