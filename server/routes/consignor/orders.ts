import { Router, Request, Response } from "express";
import { storage } from "../../storage";

const router = Router();

// GET /api/consignor/orders
// Get all orders for the authenticated consignor
router.get("/", async (req: Request, res: Response) => {
  try {
    // Get the consignor's customer ID from their user account
    if (!req.user?.customerId) {
      return res.status(400).json({
        success: false,
        message: "User is not linked to a customer account"
      });
    }
    
    const orders = await storage.getOrdersWithDetailsByCustomerId(req.user.customerId);
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error("Error fetching consignor orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders"
    });
  }
});

// GET /api/consignor/orders/:id
// Get specific order details for the authenticated consignor
router.get("/:id", async (req: Request, res: Response) => {
  try {
    // Get the consignor's customer ID from their user account
    if (!req.user?.customerId) {
      return res.status(400).json({
        success: false,
        message: "User is not linked to a customer account"
      });
    }
    
    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID"
      });
    }
    
    // Get the order
    const order = await storage.getOrderWithDetails(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    // Verify the order belongs to this consignor
    if (order.customerId !== req.user.customerId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this order"
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order details"
    });
  }
});

export default router;