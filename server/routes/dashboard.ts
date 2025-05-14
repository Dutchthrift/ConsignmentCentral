import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { calculateCommission } from "../utils/commission";
import { PayoutType } from "@shared/schema";

const router = Router();

// GET /api/dashboard/:consignorId - get dashboard for a specific consignor
router.get("/:consignorId", async (req: Request, res: Response) => {
  try {
    const consignorId = parseInt(req.params.consignorId, 10);
    
    if (isNaN(consignorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid consignor ID",
      });
    }
    
    // Get customer and their items
    const customer = await storage.getCustomer(consignorId);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Consignor not found",
      });
    }
    
    const items = await storage.getItemsWithDetailsByCustomerId(consignorId);
    
    // Format the data for the dashboard
    const formattedItems = items.map((item) => {
      const pricing = item.pricing || { suggestedListingPrice: 0, commissionRate: 0 };
      
      return {
        id: item.id,
        referenceId: item.referenceId,
        title: item.title,
        imageUrl: item.imageUrl,
        status: item.status,
        createdAt: item.createdAt,
        estimatedPrice: pricing.suggestedListingPrice ? pricing.suggestedListingPrice / 100 : undefined,
        commissionRate: pricing.commissionRate,
        payoutAmount: pricing.finalPayout ? pricing.finalPayout / 100 : undefined,
        payoutType: pricing.payoutType || PayoutType.CASH,
        finalSalePrice: pricing.finalSalePrice ? pricing.finalSalePrice / 100 : undefined,
      };
    });
    
    // Calculate total sales
    const totalSales = items.reduce((sum, item) => {
      if (item.pricing && item.pricing.finalSalePrice) {
        return sum + item.pricing.finalSalePrice / 100;
      }
      return sum;
    }, 0);
    
    res.json({
      success: true,
      data: {
        consignor: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          totalItems: items.length,
          totalSales,
        },
        items: formattedItems,
      },
    });
  } catch (error) {
    console.error("Error getting consignor dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving consignor dashboard",
    });
  }
});

// POST /api/dashboard/:consignorId/items/:itemId/payout - update payout preference for an item
router.post("/:consignorId/items/:itemId/payout", async (req: Request, res: Response) => {
  try {
    const consignorId = parseInt(req.params.consignorId, 10);
    const itemId = parseInt(req.params.itemId, 10);
    const { payoutType } = req.body;
    
    if (isNaN(consignorId) || isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID parameters",
      });
    }
    
    if (payoutType !== PayoutType.CASH && payoutType !== PayoutType.STORE_CREDIT) {
      return res.status(400).json({
        success: false,
        message: "Invalid payout type",
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
    
    if (item.customerId !== consignorId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this item",
      });
    }
    
    // Get pricing info
    const pricing = await storage.getPricingByItemId(itemId);
    
    if (!pricing) {
      return res.status(404).json({
        success: false,
        message: "Pricing information not found",
      });
    }
    
    // Calculate payout amounts based on chosen method
    let finalPayout = pricing.finalPayout || 0;
    let storeCreditAmount = null;
    
    if (pricing.finalSalePrice) {
      // If the item is sold, recalculate based on the actual sale price
      const commissionResult = calculateCommission(pricing.finalSalePrice / 100, payoutType);
      
      if (commissionResult.eligible) {
        finalPayout = Math.round(commissionResult.payoutAmount * 100); // Convert to cents
        
        if (payoutType === PayoutType.STORE_CREDIT) {
          storeCreditAmount = finalPayout; // Store credit amount with bonus
        }
      }
    }
    
    // Update the pricing info
    const updatedPricing = await storage.updatePricing(pricing.id, {
      payoutType,
      finalPayout,
      storeCreditAmount,
    });
    
    res.json({
      success: true,
      data: {
        payoutType,
        finalPayout: finalPayout / 100, // Convert to EUR
        storeCreditAmount: storeCreditAmount ? storeCreditAmount / 100 : null,
      },
    });
  } catch (error) {
    console.error("Error updating payout preference:", error);
    res.status(500).json({
      success: false,
      message: "Error updating payout preference",
    });
  }
});

export default router;