import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { db, executeRawQuery } from "../../db";
import { items, pricing, analyses, shipping, customers } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import AuthService from "../../services/auth.service";
import { requireAdmin } from "../../middleware/auth.middleware";

const router = Router();

// Middleware to check if user is authenticated and is an admin
// Use the shared admin middleware instead of custom implementation
const requireAdminAuth = requireAdmin;

// Direct SQL query method to fetch admin by ID - bypassing Drizzle ORM issues
async function getAdminById(adminId: number) {
  try {
    console.log(`Attempting to fetch admin with ID ${adminId} using direct SQL`);
    
    // Use the new executeRawQuery function for more reliable results
    const query = `
      SELECT id, email, name, role, provider, profile_image_url, last_login, created_at
      FROM admin_users
      WHERE id = $1
    `;
    
    const result = await executeRawQuery(query, [adminId]);
    console.log('SQL query result:', JSON.stringify(result, null, 2));
    
    if (!result || result.length === 0) {
      console.log(`No admin found with ID ${adminId}`);
      return null;
    }
    
    // Map the result to expected format
    const admin = {
      id: result[0].id,
      email: result[0].email,
      name: result[0].name,
      role: result[0].role,
      provider: result[0].provider,
      profileImageUrl: result[0].profile_image_url,
      lastLogin: result[0].last_login,
      createdAt: result[0].created_at
    };
    
    console.log('Found admin:', JSON.stringify(admin, null, 2));
    return admin;
  } catch (error) {
    console.error("Error in direct SQL getAdminById:", error);
    return null;
  }
}

// Direct SQL query to get all items with related data for admin
async function getAllItems() {
  try {
    console.log('Fetching all items for admin with direct SQL');
    
    // SQL query to get all items with related pricing, analysis, shipping, and customer data
    const query = `
      SELECT 
        i.id, i.reference_id, i.title, i.description, i.category, i.status, i.image_url, 
        i.created_at, i.updated_at, i.customer_id,
        c.email AS customer_email, c.name AS customer_name, c.phone AS customer_phone, 
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
    
    // Execute query using executeRawQuery for better reliability
    const result = await executeRawQuery(query);
    console.log(`SQL query returned ${result?.length || 0} items`);
    
    if (!result || result.length === 0) {
      return {
        success: true,
        data: []
      };
    }
    
    // Map the SQL results to the expected response format
    const formattedItems = result.map(row => {
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
          name: row.customer_name,
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
    console.log(`Fetching item with ID ${itemId} using direct SQL`);
    
    // Use executeRawQuery for direct SQL queries - safer approach
    const query = `
      SELECT 
        i.id, i.reference_id, i.title, i.description, i.category, i.status, i.image_url, 
        i.created_at, i.updated_at, i.customer_id,
        c.email AS customer_email, c.name AS customer_name, c.phone AS customer_phone, 
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
    
    const result = await executeRawQuery(query, [itemId]);
    console.log(`Item query result found ${result?.length || 0} items`);
    
    if (!result || result.length === 0) {
      console.log(`No item found with ID ${itemId}`);
      return null;
    }
    
    const row = result[0];
    console.log(`Found item with title: ${row.title}`);
    
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