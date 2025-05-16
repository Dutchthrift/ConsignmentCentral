import { Router, Request, Response } from "express";
import { storage } from "../database-storage";
import { jwtAuthMiddleware } from "../middleware/auth.middleware";
import { z } from "zod";

const router = Router();

// Get a single item for a consignor (with authentication check)
router.get("/:id", jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const customerId = req.customerId;
    const itemId = req.params.id;
    
    if (!customerId) {
      return res.status(401).json({ success: false, message: "Not authenticated as a consignor" });
    }
    
    // First get the item to check ownership
    const item = await storage.getItemWithDetailsByReferenceId(itemId);
    
    // Ensure item exists and belongs to this consignor
    if (!item || item.customerId !== customerId) {
      return res.status(403).json({ 
        success: false, 
        message: "Item not found or you don't have permission to access it" 
      });
    }
    
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error("Error fetching consignor item details:", error);
    res.status(500).json({ success: false, message: "Failed to fetch item details" });
  }
});

// Update item status endpoint
router.patch("/:id/status", jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const customerId = req.customerId;
    const itemId = req.params.id;
    
    if (!customerId) {
      return res.status(401).json({ success: false, message: "Not authenticated as a consignor" });
    }
    
    // Validate the request body
    const statusSchema = z.object({
      status: z.string()
    });

    const validation = statusSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid request body",
        errors: validation.error.errors
      });
    }

    const { status } = validation.data;
    
    // First get the item to check ownership
    const item = await storage.getItemByReferenceId(itemId);
    
    // Ensure item exists and belongs to this consignor
    if (!item || item.customerId !== customerId) {
      return res.status(403).json({ 
        success: false, 
        message: "Item not found or you don't have permission to update it" 
      });
    }
    
    // Update the item status
    const updatedItem = await storage.updateItemStatus(item.id, status);
    
    if (!updatedItem) {
      return res.status(500).json({ success: false, message: "Failed to update item status" });
    }
    
    res.json({
      success: true,
      data: updatedItem
    });
  } catch (error) {
    console.error("Error updating item status:", error);
    res.status(500).json({ success: false, message: "Failed to update item status" });
  }
});

export default router;