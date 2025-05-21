/**
 * Admin routes for managing items in the Dutch Thrift consignment platform
 */
import express from 'express';
import { pool } from '../../db';
import { requireAdminAuth } from '../../middleware/auth.middleware';

const router = express.Router();

// Apply admin authentication to all routes
router.use(requireAdminAuth);

/**
 * Get all items with their order and customer information
 * GET /api/admin/items
 */
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        i.id, i.reference_id, i.title, i.description, i.category, 
        i.brand, i.color, i.size, i.condition, i.status, i.created_at,
        o.id as order_id, o.order_number, o.status as order_status,
        c.id as customer_id, c.name as customer_name, c.email as customer_email,
        a.estimated_value, a.recommended_price
      FROM 
        items i
      LEFT JOIN 
        orders o ON i.order_id = o.id
      LEFT JOIN 
        customers c ON i.customer_id = c.id
      LEFT JOIN 
        analysis a ON a.item_id = i.id
      ORDER BY 
        i.created_at DESC
    `);
    
    return res.json({
      success: true,
      data: rows
    });
  } catch (error: any) {
    console.error('Error fetching admin items:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching items'
    });
  }
});

/**
 * Get a specific item by ID with detailed information
 * GET /api/admin/items/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const itemId = req.params.id;
    
    // Get the item with related data
    const { rows } = await pool.query(`
      SELECT 
        i.*, o.order_number, o.status as order_status,
        c.name as customer_name, c.email as customer_email,
        a.estimated_value, a.recommended_price, a.key_factors, 
        a.condition_assessment, a.authentication_notes
      FROM 
        items i
      LEFT JOIN 
        orders o ON i.order_id = o.id
      LEFT JOIN 
        customers c ON i.customer_id = c.id
      LEFT JOIN 
        analysis a ON a.item_id = i.id
      WHERE 
        i.id = $1
    `, [itemId]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    // Get item photos
    const { rows: photoRows } = await pool.query(`
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

/**
 * Update an item's status
 * PATCH /api/admin/items/:id/status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const itemId = req.params.id;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    // Update the item status
    const { rows } = await pool.query(
      'UPDATE items SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, itemId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    return res.json({
      success: true,
      data: rows[0],
      message: 'Item status updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating item status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating item status'
    });
  }
});

export default router;