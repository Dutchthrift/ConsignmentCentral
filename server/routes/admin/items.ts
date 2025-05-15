import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { db } from "../../db";
import { items, pricing, analyses, shipping, customers } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import AuthService from "../../services/auth.service";

const router = Router();
const authService = new AuthService(storage);

// Middleware to check if user is authenticated and is an admin
const requireAdminAuth = async (req: Request, res: Response, next: Function) => {
  try {
    // First try JWT token authentication
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
    
    console.log('Admin JWT Auth attempt - token present:', !!token);
    
    if (token) {
      try {
        const decoded = authService.verifyToken(token);
        console.log('Admin JWT decoded:', decoded);
        
        if (decoded && decoded.id && decoded.role === 'admin') {
          try {
            // If token is valid, find the admin user using direct SQL (to avoid ORM issues)
            const user = await getAdminById(decoded.id);
            console.log('Found admin by JWT token:', !!user);
            
            if (user) {
              // Set the admin in the request
              req.user = user;
              return next();
            }
          } catch (sqlError) {
            console.error("SQL error in admin authentication:", sqlError);
            // Continue to other auth methods if SQL fails
          }
        }
      } catch (jwtError) {
        console.error("Error in admin JWT auth:", jwtError);
      }
    }
    
    // If JWT auth failed, try session authentication
    console.log('Admin session auth check:', {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      role: req.user?.role
    });
    
    if (!req.isAuthenticated() || !req.user || req.user.role !== 'admin') {
      return res.status(401).json({ 
        success: false, 
        message: "Admin authentication required" 
      });
    }
    
    next();
  } catch (error) {
    console.error("Admin authentication middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error"
    });
  }
};

// Direct SQL query method to fetch admin by ID - bypassing Drizzle ORM issues
async function getAdminById(adminId: number) {
  try {
    const query = `
      SELECT * FROM admin_users
      WHERE id = $1
    `;
    
    const result = await db.query.raw(query, [adminId]);
    
    if (!result || !result.rows || result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error("Error in direct SQL getAdminById:", error);
    return null;
  }
}

// Direct SQL query to get all items with related data for admin
async function getAllItems() {
  try {
    // SQL query to get all items with related pricing, analysis, shipping, and customer data
    const query = `
      SELECT 
        i.id, i.reference_id, i.title, i.description, i.category, i.status, i.image_url, 
        i.created_at, i.updated_at, i.customer_id,
        c.email AS customer_email, c.full_name AS customer_full_name, c.phone AS customer_phone, 
        c.country AS customer_country,
        p.id AS pricing_id, p.suggested_listing_price, p.commission_rate, p.suggested_payout, 
        p.final_sale_price, p.final_payout, p.payout_type,
        a.id AS analysis_id, a.brand, a.condition, a.product_type, a.model, 
        a.accessories, a.additional_notes, a.created_at AS analysis_created_at,
        s.id AS shipping_id, s.tracking_number, s.carrier, s.label_url, s.created_at AS shipping_created_at
      FROM items i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN pricing p ON i.id = p.item_id
      LEFT JOIN analyses a ON i.id = a.item_id
      LEFT JOIN shipping s ON i.id = s.item_id
      ORDER BY i.created_at DESC
    `;
    
    // Execute query
    const result = await db.query.raw(query);
    
    if (!result || !result.rows || result.rows.length === 0) {
      return {
        success: true,
        data: []
      };
    }
    
    // Map the SQL results to the expected response format
    const formattedItems = result.rows.map(row => {
      return {
        // Item basic fields
        id: row.id,
        referenceId: row.reference_id,
        title: row.title,
        description: row.description,
        category: row.category,
        status: row.status,
        imageUrl: row.image_url,
        customerId: row.customer_id,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
        
        // Customer info
        customer: row.customer_email ? {
          id: row.customer_id,
          email: row.customer_email,
          fullName: row.customer_full_name,
          phone: row.customer_phone,
          country: row.customer_country
        } : null,
        
        // Pricing details
        pricing: row.pricing_id ? {
          id: row.pricing_id,
          suggestedListingPrice: row.suggested_listing_price,
          commissionRate: row.commission_rate,
          suggestedPayout: row.suggested_payout,
          finalSalePrice: row.final_sale_price,
          finalPayout: row.final_payout,
          payoutType: row.payout_type
        } : null,
        
        // Analysis summary
        analysis: row.analysis_id ? {
          id: row.analysis_id,
          category: row.category, // Using item's category
          brand: row.brand,
          condition: row.condition,
          productType: row.product_type,
          model: row.model,
          accessories: row.accessories,
          additionalNotes: row.additional_notes,
          createdAt: row.analysis_created_at ? new Date(row.analysis_created_at).toISOString() : null
        } : null,
        
        // Shipping info
        shipping: row.shipping_id ? {
          id: row.shipping_id,
          trackingNumber: row.tracking_number,
          carrier: row.carrier,
          labelUrl: row.label_url,
          createdAt: row.shipping_created_at ? new Date(row.shipping_created_at).toISOString() : null
        } : null
      };
    });
    
    return {
      success: true,
      data: formattedItems
    };
  } catch (error) {
    console.error("Error getting all items:", error);
    return {
      success: false,
      message: "Error retrieving items",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Get all items (for admin)
router.get("/", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = await getAllItems();
    return res.json(result);
  } catch (error) {
    console.error("Error fetching admin items:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching items",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get a single item by ID using direct SQL (bypassing ORM issues)
async function getItemById(itemId: number) {
  try {
    const query = `
      SELECT 
        i.id, i.reference_id, i.title, i.description, i.category, i.status, i.image_url, 
        i.created_at, i.updated_at, i.customer_id,
        c.email AS customer_email, c.full_name AS customer_full_name, c.phone AS customer_phone, 
        c.country AS customer_country,
        p.id AS pricing_id, p.suggested_listing_price, p.commission_rate, p.suggested_payout, 
        p.final_sale_price, p.final_payout, p.payout_type,
        a.id AS analysis_id, a.brand, a.condition, a.product_type, a.model, 
        a.accessories, a.additional_notes, a.created_at AS analysis_created_at,
        s.id AS shipping_id, s.tracking_number, s.carrier, s.label_url, s.created_at AS shipping_created_at
      FROM items i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN pricing p ON i.id = p.item_id
      LEFT JOIN analyses a ON i.id = a.item_id
      LEFT JOIN shipping s ON i.id = s.item_id
      WHERE i.id = $1
    `;
    
    const result = await db.query.raw(query, [itemId]);
    
    if (!result || !result.rows || result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    
    // Format single item with related data
    return {
      // Item basic fields
      id: row.id,
      referenceId: row.reference_id,
      title: row.title,
      description: row.description,
      category: row.category,
      status: row.status,
      imageUrl: row.image_url,
      customerId: row.customer_id,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      
      // Customer info
      customer: row.customer_email ? {
        id: row.customer_id,
        email: row.customer_email,
        fullName: row.customer_full_name,
        phone: row.customer_phone,
        country: row.customer_country
      } : null,
      
      // Pricing details
      pricing: row.pricing_id ? {
        id: row.pricing_id,
        suggestedListingPrice: row.suggested_listing_price,
        commissionRate: row.commission_rate,
        suggestedPayout: row.suggested_payout,
        finalSalePrice: row.final_sale_price,
        finalPayout: row.final_payout,
        payoutType: row.payout_type
      } : null,
      
      // Analysis summary
      analysis: row.analysis_id ? {
        id: row.analysis_id,
        category: row.category, // Using item's category
        brand: row.brand,
        condition: row.condition,
        productType: row.product_type,
        model: row.model,
        accessories: row.accessories,
        additionalNotes: row.additional_notes,
        createdAt: row.analysis_created_at ? new Date(row.analysis_created_at).toISOString() : null
      } : null,
      
      // Shipping info
      shipping: row.shipping_id ? {
        id: row.shipping_id,
        trackingNumber: row.tracking_number,
        carrier: row.carrier,
        labelUrl: row.label_url,
        createdAt: row.shipping_created_at ? new Date(row.shipping_created_at).toISOString() : null
      } : null
    };
  } catch (error) {
    console.error("Error in direct SQL getItemById:", error);
    return null;
  }
}

// Get single item by ID (for admin)
router.get("/:itemId", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID"
      });
    }
    
    // Get the item with details using direct SQL
    const item = await getItemById(itemId);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found"
      });
    }
    
    return res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error("Error fetching item:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching item",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Update item status (for admin)
router.patch("/:itemId/status", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    const { status } = req.body;
    
    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID"
      });
    }
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }
    
    // Update the item status
    const updatedItem = await storage.updateItemStatus(itemId, status);
    
    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        message: "Item not found"
      });
    }
    
    return res.json({
      success: true,
      data: updatedItem
    });
  } catch (error) {
    console.error("Error updating item status:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating item status",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Update item pricing (for admin)
router.patch("/:itemId/pricing", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    const updates = req.body;
    
    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID"
      });
    }
    
    // Get current pricing
    const currentPricing = await storage.getPricingByItemId(itemId);
    
    if (!currentPricing) {
      return res.status(404).json({
        success: false,
        message: "Pricing not found for this item"
      });
    }
    
    // Update the pricing
    const updatedPricing = await storage.updatePricing(currentPricing.id, {
      ...currentPricing,
      ...updates
    });
    
    return res.json({
      success: true,
      data: updatedPricing
    });
  } catch (error) {
    console.error("Error updating item pricing:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating item pricing",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;