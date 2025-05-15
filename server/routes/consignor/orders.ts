import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { requireConsignorOwnership } from "../../middleware/auth.middleware";

const router = Router();

// Get all orders for the current consignor
router.get("/", requireConsignorOwnership, async (req: Request, res: Response) => {
  try {
    if (!req.user?.customerId) {
      return res.status(403).json({
        success: false,
        message: "No linked customer account found"
      });
    }

    const customerId = req.user.customerId;
    
    // Get orders for this specific consignor only
    const summaries = await storage.getOrdersWithDetailsByCustomerId(customerId);
    
    // Map to order summaries
    const orderSummaries = summaries.map(order => {
      const totalValue = order.totalValue || 
        order.items.reduce((sum, item) => sum + (item.pricing?.suggestedListingPrice || 0), 0);
        
      const totalPayout = order.totalPayout || 
        order.items.reduce((sum, item) => sum + (item.pricing?.suggestedPayout || 0), 0);

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        submissionDate: order.submissionDate.toISOString(),
        status: order.status,
        trackingCode: order.trackingCode || undefined,
        totalValue,
        totalPayout,
        itemCount: order.items.length
      };
    });
    
    return res.status(200).json({
      success: true,
      data: orderSummaries
    });
  } catch (error) {
    console.error("Error fetching consignor orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve orders"
    });
  }
});

// Get order details for a specific order
router.get("/:id", requireConsignorOwnership, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orderId = parseInt(id, 10);
    
    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID"
      });
    }
    
    if (!req.user?.customerId) {
      return res.status(403).json({
        success: false,
        message: "No linked customer account found"
      });
    }

    const customerId = req.user.customerId;
    
    // Get the order details
    const order = await storage.getOrderWithDetails(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    // Verify the order belongs to this consignor
    if (order.customerId !== customerId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this order"
      });
    }
    
    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error("Error fetching consignor order details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve order details"
    });
  }
});

export default router;