/**
 * Item intake routes for handling consignment submissions
 */
import express, { Request, Response } from 'express';
import { z } from 'zod';
import { ItemIntakeService } from '../services/item-intake.service';
import { UserTypes } from '../types';

const router = express.Router();
const itemIntakeService = new ItemIntakeService();

// Session check middleware for protected routes
const requireConsignorAuth = (req: Request, res: Response, next: express.NextFunction) => {
  // Check session data to ensure user is authenticated and is a consignor
  if (!req.session || !req.session.customerId || req.session.userType !== UserTypes.CONSIGNOR) {
    console.log('Authentication check failed for item intake:', {
      hasSession: !!req.session,
      customerId: req.session?.customerId,
      userType: req.session?.userType
    });
    
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  next();
};

// Item submission schema validation
const itemSubmissionSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().min(10),
  category: z.string(),
  brand: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  condition: z.string(),
  photos: z.array(z.string()).min(1).max(10)
});

/**
 * Submit a new item for consignment
 * POST /api/consignor/items/submit
 */
router.post('/submit', requireConsignorAuth, async (req: Request, res: Response) => {
  try {
    console.log('Item submission received from customer ID:', req.session.customerId);
    
    // Validate request body
    const validationResult = itemSubmissionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: validationResult.error.format()
      });
    }
    
    // Add customer_id from session to the item data
    const itemData = {
      ...validationResult.data,
      customer_id: req.session.customerId as number
    };
    
    // Process the item submission
    const result = await itemIntakeService.processItemSubmission(itemData);
    
    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error processing item submission:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Error processing item submission'
    });
  }
});

/**
 * Get all items for the authenticated consignor
 * GET /api/consignor/items
 */
router.get('/', requireConsignorAuth, async (req: Request, res: Response) => {
  try {
    // Query to get all items for the customer from the session
    const customerId = req.session.customerId;
    
    // Query items with order information
    const { rows } = await global.pool.query(`
      SELECT 
        i.id, i.reference_id, i.title, i.category, i.condition, i.status,
        i.created_at, o.order_number, o.id as order_id,
        a.estimated_value, a.recommended_price
      FROM 
        items i
      LEFT JOIN 
        orders o ON i.order_id = o.id
      LEFT JOIN 
        analysis a ON a.item_id = i.id
      WHERE 
        i.customer_id = $1
      ORDER BY 
        i.created_at DESC
    `, [customerId]);
    
    return res.json({
      success: true,
      data: rows
    });
  } catch (error: any) {
    console.error('Error fetching consignor items:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching items'
    });
  }
});

/**
 * Get a specific item by ID
 * GET /api/consignor/items/:id
 */
router.get('/:id', requireConsignorAuth, async (req: Request, res: Response) => {
  try {
    const itemId = req.params.id;
    const customerId = req.session.customerId;
    
    // Query the item with related data
    const { rows } = await global.pool.query(`
      SELECT 
        i.*, o.order_number, o.status as order_status,
        a.estimated_value, a.recommended_price, a.key_factors, 
        a.condition_assessment, a.authentication_notes
      FROM 
        items i
      LEFT JOIN 
        orders o ON i.order_id = o.id
      LEFT JOIN 
        analysis a ON a.item_id = i.id
      WHERE 
        i.id = $1 AND i.customer_id = $2
    `, [itemId, customerId]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    // Get item photos
    const { rows: photoRows } = await global.pool.query(`
      SELECT photo_url, position
      FROM item_photos
      WHERE item_id = $1
      ORDER BY position ASC
    `, [itemId]);
    
    // Combine item data with photos
    const itemData = {
      ...rows[0],
      photos: photoRows.map((photo: any) => photo.photo_url)
    };
    
    return res.json({
      success: true,
      data: itemData
    });
  } catch (error: any) {
    console.error('Error fetching item details:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching item details'
    });
  }
});

export default router;