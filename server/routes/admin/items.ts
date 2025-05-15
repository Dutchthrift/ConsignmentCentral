import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { requireAdmin } from "../../middleware/auth.middleware";

const router = Router();

// Get all items (admin can see all)
router.get("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    // Get all items with their details
    const itemsWithDetails = await storage.getAllItemsWithDetails();
    
    // Format the items for response
    const formattedItems = itemsWithDetails.map(item => {
      const pricing = item.pricing || {};
      
      return {
        id: item.id,
        referenceId: item.referenceId,
        title: item.title,
        brand: item.analysis?.brand || null,
        productType: item.analysis?.productType || null,
        description: item.description,
        condition: item.analysis?.condition || null,
        status: item.status,
        imageUrl: item.imageUrl,
        customerId: item.customerId,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt?.toISOString(),
        submissionSessionId: item.submissionSessionId,
        
        // Pricing details
        suggestedListingPrice: pricing.suggestedListingPrice,
        commissionRate: pricing.commissionRate,
        suggestedPayout: pricing.suggestedPayout,
        finalSalePrice: pricing.finalSalePrice,
        finalPayout: pricing.finalPayout,
        payoutType: pricing.payoutType,
        
        // Analysis summary if available
        analysis: item.analysis ? {
          id: item.analysis.id,
          category: item.analysis.category,
          brand: item.analysis.brand,
          condition: item.analysis.condition,
          estimatedValue: item.analysis.estimatedValue,
          completedAt: item.analysis.completedAt?.toISOString()
        } : null,
        
        // Shipping info if available
        shipping: item.shipping ? {
          id: item.shipping.id,
          trackingCode: item.shipping.trackingCode,
          carrier: item.shipping.carrier,
          shippedAt: item.shipping.shippedAt?.toISOString(),
          estimatedDelivery: item.shipping.estimatedDelivery?.toISOString()
        } : null
      };
    });
    
    return res.status(200).json({
      success: true,
      data: formattedItems
    });
  } catch (error) {
    console.error("Error fetching admin items:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve items"
    });
  }
});

// Get a specific item's details
router.get("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const itemId = parseInt(id, 10);
    
    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID"
      });
    }
    
    // Get the item details
    const item = await storage.getItemWithDetails(itemId);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found"
      });
    }
    
    return res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error("Error fetching admin item details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve item details"
    });
  }
});

export default router;