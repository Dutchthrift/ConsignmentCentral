/**
 * Supabase New Intake Endpoint
 * 
 * This endpoint is designed to properly write data through Supabase's API layer
 * ensuring that changes appear in both the database and the Supabase UI.
 */
import { Router } from 'express';
import { supabase } from '../../supabase-client';
import { generateReferenceId, generateOrderNumber } from '../../utils/generators';
import { calculateCommission } from '../../utils/pricing';
import jwt from 'jsonwebtoken';

const router = Router();

// Extract user ID from JWT token
function getUserIdFromToken(token: string): number | null {
  try {
    const decoded = jwt.verify(token, 'dutch-thrift-jwt-secret') as any;
    return decoded.id;
  } catch (error) {
    console.error('Failed to verify token:', error);
    return null;
  }
}

// Handle item submission
router.post('/', async (req, res) => {
  try {
    // Get authorization token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized - Valid authentication token required' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    const userId = getUserIdFromToken(token);
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid authentication token' 
      });
    }
    
    // Get item data from request
    const { title, imageBase64 } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title is required' 
      });
    }
    
    // Step 1: Get the customer associated with the user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (userError || !userData) {
      console.error('Error finding user:', userError);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Step 2: Find the customer record
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', userData.email)
      .single();
      
    if (customerError || !customerData) {
      console.error('Error finding customer:', customerError);
      return res.status(404).json({ 
        success: false, 
        message: 'Customer account not found' 
      });
    }
    
    // Step 3: Create a new order
    const orderData = {
      customer_id: customerData.id,
      status: 'awaiting_shipment',
      order_number: generateOrderNumber(),
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const { data: orderResult, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
      
    if (orderError || !orderResult) {
      console.error('Error creating order:', orderError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create order' 
      });
    }
    
    // Step 4: Create the item
    const itemData = {
      title,
      reference_id: generateReferenceId(),
      status: 'quoted',
      customer_id: customerData.id,
      image_url: '',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // If image was provided, update the URL
    if (imageBase64) {
      // In a real system, we'd upload this to a storage service
      // For now, we'll just indicate an image was included
      itemData.image_url = 'data:image/jpeg;base64,' + imageBase64.substring(0, 100);
    }
    
    const { data: itemResult, error: itemError } = await supabase
      .from('items')
      .insert(itemData)
      .select()
      .single();
      
    if (itemError || !itemResult) {
      console.error('Error creating item:', itemError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create item' 
      });
    }
    
    // Step 5: Create the order-item relationship
    const orderItemData = {
      order_id: orderResult.id,
      item_id: itemResult.id
    };
    
    const { data: relationResult, error: relationError } = await supabase
      .from('order_items')
      .insert(orderItemData)
      .select()
      .single();
      
    if (relationError) {
      console.error('Error creating order-item relation:', relationError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to link item to order' 
      });
    }
    
    // Step 6: Create pricing info with default values
    const estimatedValue = 5000; // Default $50.00
    const commissionInfo = calculateCommission(estimatedValue);
    
    const pricingData = {
      item_id: itemResult.id,
      estimated_value: estimatedValue,
      commission_rate: commissionInfo.commissionRate,
      commission_amount: commissionInfo.commissionAmount,
      payout_amount: commissionInfo.payoutAmount,
      created_at: new Date()
    };
    
    const { data: pricingResult, error: pricingError } = await supabase
      .from('pricing')
      .insert(pricingData)
      .select()
      .single();
      
    if (pricingError) {
      console.error('Error creating pricing info:', pricingError);
      // We'll consider this non-critical and continue
    }
    
    // Return success response with created data
    return res.status(201).json({
      success: true,
      item: itemResult,
      order: orderResult,
      relation: relationResult,
      pricing: pricingResult,
      message: 'Item successfully added to consignment'
    });
    
  } catch (error) {
    console.error('Error processing intake:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

export default router;