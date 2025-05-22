import express from 'express';
import { isAdmin } from '../../middleware/auth.middleware.js';
import supabase from '../../../shared/supabase.js';

const router = express.Router();

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', isAdmin, async (req, res) => {
  try {
    // Get counts from Supabase
    const [customersResult, ordersResult, itemsResult] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('items').select('*', { count: 'exact', head: true }),
    ]);
    
    // Calculate totals
    const { data: itemsValueData, error: itemsValueError } = await supabase
      .from('items')
      .select('estimated_value, payout_value');
      
    let totalItemValue = 0;
    let totalPayoutValue = 0;
    
    if (!itemsValueError && itemsValueData) {
      totalItemValue = itemsValueData.reduce((sum, item) => sum + (parseFloat(item.estimated_value) || 0), 0);
      totalPayoutValue = itemsValueData.reduce((sum, item) => sum + (parseFloat(item.payout_value) || 0), 0);
    }
    
    // Get recent orders
    const { data: recentOrders, error: recentOrdersError } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        status,
        total_estimated_value,
        customers (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);
      
    // Return stats
    return res.status(200).json({
      consignorCount: customersResult.count || 0,
      orderCount: ordersResult.count || 0,
      itemCount: itemsResult.count || 0,
      totalItemValue: totalItemValue.toFixed(2),
      totalPayoutValue: totalPayoutValue.toFixed(2),
      recentOrders: recentOrdersError ? [] : recentOrders,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch admin statistics' 
    });
  }
});

/**
 * GET /api/admin/consignors
 * Get all consignors for admin
 */
router.get('/consignors', isAdmin, async (req, res) => {
  try {
    const { data: consignors, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    // Remove password hash from response
    const sanitizedConsignors = consignors.map(({ password_hash, ...rest }) => rest);
    
    return res.status(200).json(sanitizedConsignors);
  } catch (error) {
    console.error('Error fetching consignors:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch consignors' 
    });
  }
});

/**
 * GET /api/admin/items
 * Get all items for admin
 */
router.get('/items', isAdmin, async (req, res) => {
  try {
    const { data: items, error } = await supabase
      .from('items')
      .select(`
        *,
        orders (
          id,
          customer_id,
          status,
          customers (
            id,
            name,
            email
          )
        )
      `)
      .order('created_at', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    return res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch items' 
    });
  }
});

/**
 * GET /api/admin/orders
 * Get all orders for admin
 */
router.get('/orders', isAdmin, async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (
          id,
          name,
          email
        ),
        items (*)
      `)
      .order('created_at', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    return res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch orders' 
    });
  }
});

export default router;