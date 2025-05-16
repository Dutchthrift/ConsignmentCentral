import { Router, Request, Response } from "express";
import { storage } from "../database-storage";
import { jwtAuthMiddleware } from "../middleware/auth.middleware";

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

export default router;