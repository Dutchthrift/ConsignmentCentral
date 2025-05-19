import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { pool } from "../../db";
import { z } from "zod";
import {
  insertOrderSchema,
  OrderStatus,
} from "@shared/schema";

const router = Router();

// Get all orders with summary information
router.get("/", async (req: Request, res: Response) => {
  try {
    // Try using direct database access first for better reliability
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM orders_summary
      `);
      
      return res.status(200).json({
        success: true,
        data: result.rows
      });
    } catch (dbError) {
      console.error("Direct DB query error:", dbError);
      // Fall back to storage method if direct access fails
      const summaries = await storage.getOrderSummaries();
      
      return res.status(200).json({
        success: true,
        data: summaries
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve orders"
    });
  }
});

// Search orders
router.get("/search", async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== "string") {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }
    
    const results = await storage.searchOrders(query);
    
    return res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error searching orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search orders"
    });
  }
});

// Get order by ID with full details
router.get("/:id", async (req: Request, res: Response) => {
  try {
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

// Get order by order number with full details
router.get("/number/:orderNumber", async (req: Request, res: Response) => {
  try {
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
    
    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error("Error fetching order details by number:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve order details"
    });
  }
});

// Create a new order
router.post("/", async (req: Request, res: Response) => {
  try {
    const orderData = req.body;
    
    // Validate request data
    const validationResult = insertOrderSchema.safeParse(orderData);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid order data",
        errors: validationResult.error.errors
      });
    }
    
    const newOrder = await storage.createOrder(validationResult.data);
    
    return res.status(201).json({
      success: true,
      data: newOrder
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create order"
    });
  }
});

// Update order status
router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const orderId = parseInt(id, 10);
    
    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID"
      });
    }
    
    // Validate status
    if (!status || !Object.values(OrderStatus).includes(status as typeof OrderStatus[keyof typeof OrderStatus])) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value"
      });
    }
    
    const updatedOrder = await storage.updateOrder(orderId, { status: status as typeof OrderStatus[keyof typeof OrderStatus] });
    
    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    return res.status(200).json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update order status"
    });
  }
});

// Update order tracking code
router.patch("/:id/tracking", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { trackingCode } = req.body;
    const orderId = parseInt(id, 10);
    
    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID"
      });
    }
    
    if (!trackingCode || typeof trackingCode !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid tracking code is required"
      });
    }
    
    const updatedOrder = await storage.updateOrderTrackingCode(orderId, trackingCode);
    
    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    return res.status(200).json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error("Error updating tracking code:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update tracking code"
    });
  }
});

// Add item to order
router.post("/:id/items", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { itemId } = req.body;
    const orderId = parseInt(id, 10);
    const itemIdNum = parseInt(itemId, 10);
    
    if (isNaN(orderId) || isNaN(itemIdNum)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID or item ID"
      });
    }
    
    const orderItem = await storage.addItemToOrder(orderId, itemIdNum);
    
    return res.status(201).json({
      success: true,
      data: orderItem
    });
  } catch (error) {
    console.error("Error adding item to order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add item to order"
    });
  }
});

// Remove item from order
router.delete("/:orderId/items/:itemId", async (req: Request, res: Response) => {
  try {
    const { orderId, itemId } = req.params;
    const orderIdNum = parseInt(orderId, 10);
    const itemIdNum = parseInt(itemId, 10);
    
    if (isNaN(orderIdNum) || isNaN(itemIdNum)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID or item ID"
      });
    }
    
    const result = await storage.removeItemFromOrder(orderIdNum, itemIdNum);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Order item not found"
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Item removed from order successfully"
    });
  } catch (error) {
    console.error("Error removing item from order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove item from order"
    });
  }
});

// Update entire order
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orderData = req.body;
    const orderId = parseInt(id, 10);
    
    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID"
      });
    }
    
    // Partial validation - only validate fields that are present
    const validationResult = z.object({
      customerId: z.number().optional(),
      orderNumber: z.string().optional(),
      submissionDate: z.date().optional(),
      status: z.enum(Object.values(OrderStatus) as [string, ...string[]]).optional(),
      trackingCode: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    }).safeParse(orderData);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid order data",
        errors: validationResult.error.errors
      });
    }
    
    const updatedOrder = await storage.updateOrder(orderId, validationResult.data);
    
    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    return res.status(200).json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error("Error updating order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update order"
    });
  }
});

export default router;