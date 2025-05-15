import { Router, Request, Response } from "express";
import { storage } from "../../storage";

const router = Router();

// Get all orders for the authenticated consignor
router.get("/", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated and has a customerId
    if (!req.isAuthenticated() || !req.user || !req.user.customerId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated or not a consignor"
      });
    }
    
    const consignorId = req.user.customerId;
    const orders = await storage.getOrdersWithDetailsByCustomerId(consignorId);
    
    return res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error("Error fetching consignor orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve orders"
    });
  }
});

// Get detailed information for a specific order
router.get("/:id", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated and has a customerId
    if (!req.isAuthenticated() || !req.user || !req.user.customerId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated or not a consignor"
      });
    }
    
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    
    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID"
      });
    }
    
    const order = await storage.getOrderWithDetails(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    // Ensure the order belongs to the authenticated consignor
    if (order.customer.id !== req.user.customerId) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this order"
      });
    }
    
    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve order details"
    });
  }
});

// Get order by order number
router.get("/number/:orderNumber", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated and has a customerId
    if (!req.isAuthenticated() || !req.user || !req.user.customerId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated or not a consignor"
      });
    }
    
    const { orderNumber } = req.params;
    
    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        message: "Order number is required"
      });
    }
    
    const order = await storage.getOrderWithDetailsByNumber(orderNumber);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    // Ensure the order belongs to the authenticated consignor
    if (order.customer.id !== req.user.customerId) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this order"
      });
    }
    
    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error("Error fetching order by number:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve order details"
    });
  }
});

// Get items for a specific order
router.get("/:id/items", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated and has a customerId
    if (!req.isAuthenticated() || !req.user || !req.user.customerId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated or not a consignor"
      });
    }
    
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    
    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID"
      });
    }
    
    // First verify the order belongs to this consignor
    const order = await storage.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    if (order.customerId !== req.user.customerId) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this order"
      });
    }
    
    // Get the order items
    const items = await storage.getOrderItems(orderId);
    
    return res.status(200).json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error("Error fetching order items:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve order items"
    });
  }
});

// Get consignor sales statistics
router.get("/stats/sales", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated and has a customerId
    if (!req.isAuthenticated() || !req.user || !req.user.customerId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated or not a consignor"
      });
    }
    
    const consignorId = req.user.customerId;
    const stats = await storage.getConsignorStats(consignorId);
    
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error fetching consignor stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve stats"
    });
  }
});

export default router;