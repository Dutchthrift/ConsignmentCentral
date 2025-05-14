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
    tier4Rate: 25, // 500-999.99 EUR → 25%
    tier5Rate: 20, // 1000+ EUR → 20%
  },
  thresholds: {
    tier1Min: 50,   // EUR
    tier2Min: 100,  // EUR
    tier3Min: 200,  // EUR
    tier4Min: 500,  // EUR
    tier5Min: 1000, // EUR
  },
  minThreshold: 50, // EUR
};

let commissionSettings = { ...DEFAULT_COMMISSION_SETTINGS };

// GET /api/admin/consignment-settings
router.get("/consignment-settings", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: commissionSettings,
  });
});

// POST /api/admin/consignment-settings
router.post("/consignment-settings", (req: Request, res: Response) => {
  try {
    // Validate the settings using the schema
    const validatedSettings = commissionSettingsSchema.parse(req.body);
    
    // Update the settings
    commissionSettings = validatedSettings;
    
    res.json({
      success: true,
      data: commissionSettings,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Invalid commission settings format",
        errors: error.format(),
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Error updating commission settings",
      });
    }
  }
});

// GET /api/admin/commission-calculator
router.get("/commission-calculator", (req: Request, res: Response) => {
  try {
    const marketValueStr = req.query.marketValue as string;
    const marketValue = parseFloat(marketValueStr);
    const payoutType = (req.query.payoutType as string) || 'cash';
    
    if (isNaN(marketValue)) {
      return res.status(400).json({
        success: false,
        message: "Invalid market value. Please provide a valid number.",
      });
    }
    
    // Check if the item is eligible for consignment
    const eligibilityCheck = checkEligibility(marketValue);
    
    if (!eligibilityCheck.eligible) {
      return res.json({
        success: true,
        data: {
          marketValue,
          eligible: false,
          reason: eligibilityCheck.reason || "Item is not eligible for consignment",
        },
      });
    }
    
    // Calculate the commission
    const commission = calculateCommission(marketValue, payoutType);
    
    res.json({
      success: true,
      data: {
        marketValue,
        eligible: true,
        commissionRate: commission.commissionRate,
        commissionAmount: commission.commissionAmount,
        payoutAmount: commission.payoutAmount,
        payoutType: commission.payoutType
      },
    });
  } catch (error) {
    console.error("Error calculating commission:", error);
    res.status(500).json({
      success: false,
      message: (error as Error).message || "Error calculating commission",
    });
  }
});

// GET /api/admin/consignors - list all consignors
router.get("/consignors", async (req: Request, res: Response) => {
  try {
    // Get all users with role consignor
    const consignorUsers = await storage.getUsersByRole('consignor');
    
    // Simplified version - just return users with no additional processing
    const consignors = consignorUsers.map(user => {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        totalItems: 0,
        totalSales: 0
      };
    });
    
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
    
    // Simplified response - just return the user info
    const consignorData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      customerId: user.customerId,
      createdAt: user.createdAt,
      items: [],
      totalSales: 0
    };
    
    res.json({
      success: true,
      data: consignorData
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
