import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { 
  commissionSettingsSchema, 
  commissionTierSchema,
  Item,
  ItemWithDetails,
  Customer
} from "@shared/schema";
import { ZodError } from "zod";
import { calculateCommission, checkEligibility } from "../utils/commission.ts";

const router = Router();

// Default commission settings
const DEFAULT_COMMISSION_SETTINGS = {
  tiers: {
    tier1Rate: 50, // 50-99.99 EUR → 50%
    tier2Rate: 40, // 100-199.99 EUR → 40%
    tier3Rate: 30, // 200-499.99 EUR → 30%
    tier4Rate: 20, // 500+ EUR → 20%
    storeCreditBonus: 10, // 10% bonus for store credit
    minimumValue: 50, // Minimum value for consignment (50 EUR)
  },
  storeCreditEnabled: true,
  directBuyoutEnabled: false,
  recyclingEnabled: true,
};

// In-memory storage for commission settings (in a real app, this would be in a database)
let commissionSettings = { ...DEFAULT_COMMISSION_SETTINGS };

// GET /api/admin/consignment-settings
router.get("/consignment-settings", (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: commissionSettings,
    });
  } catch (error) {
    console.error("Error getting commission settings:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving commission settings",
    });
  }
});

// POST /api/admin/consignment-settings
router.post("/consignment-settings", (req: Request, res: Response) => {
  try {
    const data = commissionSettingsSchema.parse(req.body);
    commissionSettings = data;
    
    res.json({
      success: true,
      data: commissionSettings,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }
    
    console.error("Error updating commission settings:", error);
    res.status(500).json({
      success: false,
      message: "Error updating commission settings",
    });
  }
});

// GET /api/admin/commission-calculator - utility endpoint for testing commission calculation
router.get("/commission-calculator", (req: Request, res: Response) => {
  try {
    const salePrice = Number(req.query.price || req.query.salePrice); // Support both price and salePrice params
    const payoutType = (req.query.type || req.query.payoutType) as string || "cash"; // Support both type and payoutType
    
    if (isNaN(salePrice)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale price",
      });
    }
    
    if (payoutType !== 'cash' && payoutType !== 'storecredit') {
      return res.status(400).json({
        success: false,
        message: "Invalid payout type. Must be 'cash' or 'storecredit'"
      });
    }
    
    const result = calculateCommission(salePrice, payoutType);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error calculating commission:", error);
    res.status(500).json({
      success: false,
      message: (error as Error).message || "Error calculating commission",
    });
  }
});

import { Item } from "@shared/schema";

// GET /api/admin/consignors - list all consignors
router.get("/consignors", async (req: Request, res: Response) => {
  try {
    // Get all users with role consignor
    const consignorUsers = await storage.getUsersByRole('consignor');
    
    // For each user, get their customer data and items
    const consignors = await Promise.all(
      consignorUsers.map(async (user) => {
        let totalItems = 0;
        let totalSales = 0;
        let items: Item[] = [];
        
        // If user has a linked customer, get their items
        if (user.customerId) {
          items = await storage.getItemsByCustomerId(user.customerId);
          
          // Calculate stats
          totalItems = items.length;
          
          // Count sales and calculate total
          for (const item of items) {
            if (item.status === "sold" || item.status === "paid") {
              const pricing = await storage.getPricingByItemId(item.id);
              if (pricing && pricing.finalSalePrice) {
                totalSales += pricing.finalSalePrice / 100; // Convert cents to EUR
              }
            }
          }
        }
        
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          totalItems,
          totalSales,
        };
      })
    );
    
    res.json({
      success: true,
      data: consignors,
    });
  } catch (error) {
    console.error("Error getting consignors:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving consignor data",
    });
  }
});

// GET /api/admin/consignors/:id - get details for a specific consignor
router.get("/consignors/:id", async (req: Request, res: Response) => {
  try {
    const consignorId = parseInt(req.params.id, 10);
    
    if (isNaN(consignorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid consignor ID",
      });
    }
    
    // Get user with consignor role
    const user = await storage.getUserById(consignorId);
    
    if (!user || user.role !== 'consignor') {
      return res.status(404).json({
        success: false,
        message: "Consignor not found",
      });
    }
    
    // Placeholder for items
    let items: ItemWithDetails[] = [];
    let customer = null;
    
    // If user has a linked customer, get their items
    if (user.customerId) {
      customer = await storage.getCustomer(user.customerId);
      items = await storage.getItemsWithDetailsByCustomerId(user.customerId);
    }
    
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
        payoutType: pricing.payoutType,
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
    console.error("Error getting consignor details:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving consignor details",
    });
  }
});

export default router;