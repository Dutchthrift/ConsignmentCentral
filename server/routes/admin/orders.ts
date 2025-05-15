import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { OrderStatus, insertOrderSchema } from "@shared/schema";
import { ZodError } from "zod";

const router = Router();

// GET /api/admin/orders
// Get all orders with summaries
router.get("/", async (req: Request, res: Response) => {
  try {
    const orderSummaries = await storage.getOrderSummaries();
    
    res.json({
      success: true,
      data: orderSummaries
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders"
    });
  }
});

// GET /api/admin/orders/search?q=query
// Search orders by query
router.get("/search", async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    
    if (!query || query.trim().length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const results = await storage.searchOrders(query);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error searching orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search orders"
    });
  }
});

// GET /api/admin/orders/:id
// Get order details by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    
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

// GET /api/admin/orders/number/:orderNumber
// Get order details by order number
router.get("/number/:orderNumber", async (req: Request, res: Response) => {
  try {
    const orderNumber = req.params.orderNumber;
    
    const order = await storage.getOrderWithDetailsByNumber(orderNumber);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
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

// POST /api/admin/orders
// Create a new order
router.post("/", async (req: Request, res: Response) => {
  try {
    // Generate order number - format: ORD-YYYYMMDD-1234
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderNumber = `ORD-${year}${month}${day}-${random}`;
    
    // Validate order data
    const orderData = insertOrderSchema.parse({
      ...req.body,
      orderNumber,
      status: req.body.status || OrderStatus.NEW,
      submissionDate: req.body.submissionDate || new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Create the order
    const newOrder = await storage.createOrder(orderData);
    
    // If items are included, add them to the order
    if (req.body.itemIds && Array.isArray(req.body.itemIds)) {
      for (const itemId of req.body.itemIds) {
        await storage.addItemToOrder(newOrder.id, itemId);
      }
    }
    
    // Get the complete order with details
    const orderWithDetails = await storage.getOrderWithDetails(newOrder.id);
    
    res.status(201).json({
      success: true,
      data: orderWithDetails
    });
  } catch (error) {
    console.error("Error creating order:", error);
    
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to create order"
    });
  }
});

// POST /api/admin/orders/:id/items
// Add an item to an order
router.post("/:id/items", async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const itemId = req.body.itemId;
    
    if (isNaN(orderId) || !itemId) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID or item ID"
      });
    }
    
    // Verify order exists
    const order = await storage.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    // Verify item exists
    const item = await storage.getItem(itemId);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found"
      });
    }
    
    // Add item to order
    const orderItem = await storage.addItemToOrder(orderId, itemId);
    
    res.status(201).json({
      success: true,
      data: orderItem
    });
  } catch (error) {
    console.error("Error adding item to order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add item to order"
    });
  }
});

// DELETE /api/admin/orders/:orderId/items/:itemId
// Remove an item from an order
router.delete("/:orderId/items/:itemId", async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const itemId = parseInt(req.params.itemId);
    
    if (isNaN(orderId) || isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID or item ID"
      });
    }
    
    // Remove item from order
    const success = await storage.removeItemFromOrder(orderId, itemId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: "Order item not found"
      });
    }
    
    res.json({
      success: true,
      message: "Item removed from order"
    });
  } catch (error) {
    console.error("Error removing item from order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove item from order"
    });
  }
});

// PATCH /api/admin/orders/:id/status
// Update order status
router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (isNaN(orderId) || !status) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID or status"
      });
    }
    
    // Verify status is valid
    if (!Object.values(OrderStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value"
      });
    }
    
    // Update order status
    const updatedOrder = await storage.updateOrder(orderId, { 
      status,
      updatedAt: new Date()
    });
    
    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    res.json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status"
    });
  }
});

// PATCH /api/admin/orders/:id/tracking
// Update order tracking code
router.patch("/:id/tracking", async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const { trackingCode } = req.body;
    
    if (isNaN(orderId) || !trackingCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID or tracking code"
      });
    }
    
    // Update order tracking code
    const updatedOrder = await storage.updateOrderTrackingCode(orderId, trackingCode);
    
    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    res.json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error("Error updating tracking code:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update tracking code"
    });
  }
});

// PATCH /api/admin/orders/:id
// Update order details
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID"
      });
    }
    
    // Get existing order
    const existingOrder = await storage.getOrder(orderId);
    
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    // Update order
    const updatedOrder = await storage.updateOrder(orderId, { 
      ...req.body,
      updatedAt: new Date()
    });
    
    res.json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error("Error updating order:", error);
    
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to update order"
    });
  }
});

export default router;