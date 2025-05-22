import express from 'express';
import { isConsignor } from '../../middleware/auth.middleware.js';
import supabase from '../../../shared/supabase.js';

const router = express.Router();

/**
 * GET /api/consignor/dashboard
 * Get consignor dashboard data
 */
router.get('/dashboard', isConsignor, async (req, res) => {
  try {
    const customerId = req.session.customerId;
    
    // Get consignor data
    const { data: consignorData, error: consignorError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();
      
    if (consignorError) {
      throw consignorError;
    }
    
    // Get order stats
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, total_estimated_value, total_payout_value, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
      
    if (ordersError) {
      throw ordersError;
    }
    
    // Get item counts by status
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, status, estimated_value, payout_value')
      .in('order_id', orders.map(order => order.id));
      
    if (itemsError) {
      throw itemsError;
    }
    
    // Calculate dashboard stats
    const totalItems = items.length;
    const itemsByStatus = items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    
    const totalEstimatedValue = items.reduce((sum, item) => sum + (parseFloat(item.estimated_value) || 0), 0);
    const totalPayoutValue = items.reduce((sum, item) => sum + (parseFloat(item.payout_value) || 0), 0);
    
    // Sanitize consignor data (remove password hash)
    const { password_hash, ...consignor } = consignorData;
    
    return res.status(200).json({
      consignor,
      stats: {
        totalOrders: orders.length,
        totalItems,
        itemsByStatus,
        totalEstimatedValue: totalEstimatedValue.toFixed(2),
        totalPayoutValue: totalPayoutValue.toFixed(2),
      },
      recentOrders: orders.slice(0, 5),
    });
  } catch (error) {
    console.error('Error fetching consignor dashboard:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch dashboard data' 
    });
  }
});

/**
 * GET /api/consignor/items
 * Get all items for the authenticated consignor
 */
router.get('/items', isConsignor, async (req, res) => {
  try {
    const customerId = req.session.customerId;
    
    // First get all orders for this consignor
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('customer_id', customerId);
      
    if (ordersError) {
      throw ordersError;
    }
    
    // If consignor has no orders, return empty array
    if (!orders || orders.length === 0) {
      return res.status(200).json([]);
    }
    
    // Get all items for these orders
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select(`
        *,
        orders (
          id,
          status,
          created_at
        )
      `)
      .in('order_id', orders.map(order => order.id))
      .order('created_at', { ascending: false });
      
    if (itemsError) {
      throw itemsError;
    }
    
    return res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching consignor items:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch items' 
    });
  }
});

/**
 * GET /api/consignor/orders
 * Get all orders for the authenticated consignor
 */
router.get('/orders', isConsignor, async (req, res) => {
  try {
    const customerId = req.session.customerId;
    
    // Get all orders with their items
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        items (*)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
      
    if (ordersError) {
      throw ordersError;
    }
    
    return res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching consignor orders:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch orders' 
    });
  }
});

/**
 * POST /api/consignor/items
 * Create a new item for the authenticated consignor
 */
router.post('/items', isConsignor, async (req, res) => {
  try {
    const customerId = req.session.customerId;
    const { title, image_urls, estimated_value } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Item title is required' 
      });
    }
    
    // Calculate payout value (e.g., 60% of estimated value)
    const commission_rate = 40; // 40% commission
    const payout_value = estimated_value ? estimated_value * (1 - commission_rate/100) : 0;
    
    // First, check if there's an existing open order for this consignor
    let { data: existingOrder, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('customer_id', customerId)
      .eq('status', 'awaiting_shipment')
      .maybeSingle();
      
    if (orderError) {
      throw orderError;
    }
    
    // If no open order exists, create one
    if (!existingOrder) {
      const { data: newOrder, error: createOrderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          total_estimated_value: estimated_value || 0,
          total_payout_value: payout_value || 0,
          status: 'awaiting_shipment'
        })
        .select()
        .single();
        
      if (createOrderError) {
        throw createOrderError;
      }
      
      existingOrder = newOrder;
    }
    
    // Create the item
    const { data: item, error: itemError } = await supabase
      .from('items')
      .insert({
        order_id: existingOrder.id,
        title,
        image_urls: image_urls || [],
        estimated_value: estimated_value || 0,
        payout_value: payout_value || 0,
        commission_rate,
        status: 'quoted'
      })
      .select()
      .single();
      
    if (itemError) {
      throw itemError;
    }
    
    // Update order totals
    const { data: orderItems, error: getItemsError } = await supabase
      .from('items')
      .select('estimated_value, payout_value')
      .eq('order_id', existingOrder.id);
      
    if (!getItemsError && orderItems) {
      const totalEstimatedValue = orderItems.reduce((sum, item) => sum + (parseFloat(item.estimated_value) || 0), 0);
      const totalPayoutValue = orderItems.reduce((sum, item) => sum + (parseFloat(item.payout_value) || 0), 0);
      
      await supabase
        .from('orders')
        .update({
          total_estimated_value: totalEstimatedValue,
          total_payout_value: totalPayoutValue
        })
        .eq('id', existingOrder.id);
    }
    
    return res.status(201).json({
      success: true,
      data: {
        item,
        order: existingOrder
      }
    });
  } catch (error) {
    console.error('Error creating consignor item:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create item' 
    });
  }
});

export default router;