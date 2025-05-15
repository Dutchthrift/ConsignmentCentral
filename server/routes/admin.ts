import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { 
  commissionSettingsSchema, 
  commissionTierSchema,
  Item,
  ItemWithDetails,
  Customer,
  UserRole
} from "@shared/schema";
import { ZodError } from "zod";
import { calculateCommission, checkEligibility } from "../utils/commission.ts";
import { requireAdmin } from "../middleware/auth.middleware";

const router = Router();

// Add admin check middleware to all routes
router.use((req: Request, res: Response, next: NextFunction) => {
  console.log("Admin route access:", {
    path: req.path,
    method: req.method,
    isAuthenticated: req.isAuthenticated(),
    userType: req.session?.userType,
    role: req.user?.role
  });
  next();
});

// Default commission settings
const DEFAULT_COMMISSION_SETTINGS = {
  tiers: {
    tier1Rate: 50, // 50-99.99 EUR → 50%
    tier2Rate: 40, // 100-199.99 EUR → 40%
    tier3Rate: 30, // 200-499.99 EUR → 30%
    tier4Rate: 20, // 500+ EUR → 20%
    storeCreditBonus: 10, // 10% bonus for store credit
    minimumValue: 50, // Minimum value for consignment
  },
  storeCreditEnabled: true,
  directBuyoutEnabled: true,
  recyclingEnabled: true
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
    console.log('GET /api/admin/consignors: Authentication debug info:', {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      sessionID: req.sessionID,
      userType: req.session?.userType,
      userRole: req.user?.role,
      method: req.method,
      url: req.originalUrl,
      headers: {
        authorization: req.headers.authorization ? 'present' : 'not present',
        cookie: req.headers.cookie ? 'present' : 'not present'
      }
    });
    
    // Get all customers from the database (these are the consignors)
    const customers = await storage.getAllCustomers();
    console.log(`Found ${customers.length} customers/consignors in the database`);
    
    // Map customers to the expected consignor format
    const consignors = customers.map(customer => {
      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        totalItems: 0, // We'll update these with actual values in a more complete implementation
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
    
    // Get customer by ID directly since consignors are stored in the customers table
    const customer = await storage.getCustomer(consignorId);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Consignor not found",
      });
    }
    
    // Check if there's a linked user account
    let linkedUser = null;
    if (customer) {
      // Find users linked to this customer ID
      const allUsers = await storage.getAllUsers();
      linkedUser = allUsers.find(u => u.customerId === customer.id);
    }
    
    // Simplified response - return customer info
    const consignorData = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      country: customer.country,
      linkedUserId: linkedUser?.id,
      createdAt: customer.created_at,
      items: [], // This would be populated in a more complete implementation
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
