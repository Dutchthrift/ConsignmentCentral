import { Router, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { supabase } from '../../supabase-client';
import { generateReferenceId, generateOrderNumber } from '../../utils/generators';
import { calculateCommission } from '../../utils/pricing';

// Initialize environment variables
dotenv.config();

// Define the intake schema
const intakeSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title too long"),
  imageBase64: z.string().min(10, "Image data is required"),
  description: z.string().optional(),
});

// Create the router
const router = Router();

/**
 * POST /api/new-intake-supabase
 * Process a new item consignment submission using Supabase
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate the input
    const { title, imageBase64, description } = intakeSchema.parse(req.body);
    
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    let decodedToken;
    
    try {
      // Use the same JWT secret as in auth.service.ts
      decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'dutch-thrift-jwt-secret') as any;
    } catch (err) {
      console.error('Token verification error:', err);
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    
    // Extract user ID from token
    const userId = decodedToken.id;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID not found in token' });
    }
    
    // Find the correct customer ID from the customers table using the email
    const email = decodedToken.email;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email not found in token' });
    }
    
    // Look up the customer using Supabase
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email)
      .single();
    
    if (customerError || !customer) {
      console.error('Error finding customer:', customerError);
      return res.status(404).json({ success: false, message: 'Customer not found with this email' });
    }
    
    const customerId = customer.id;
    console.log(`Processing intake for user ID: ${userId}, found customer ID: ${customerId}`);
    
    try {
      // Generate unique identifiers
      const orderNumber = generateOrderNumber();
      const referenceId = generateReferenceId();
      
      // Set default value estimates - fixed at €50.00 for now
      const estimatedValue = 5000; // €50.00
      const { commissionRate, commissionAmount, sellerPayout } = calculateCommission(estimatedValue);
      
      // 1. Create the order using Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          order_number: orderNumber,
          status: 'awaiting_shipment',
          total_value: estimatedValue,
          total_payout: sellerPayout,
          submission_date: new Date().toISOString()
        })
        .select()
        .single();
      
      if (orderError) {
        console.error('Error creating order:', orderError);
        throw new Error(`Failed to create order: ${orderError.message}`);
      }
      
      console.log(`Created order with ID ${order.id}`);
      
      // 2. Create the item using Supabase
      const { data: item, error: itemError } = await supabase
        .from('items')
        .insert({
          reference_id: referenceId,
          customer_id: customerId,
          title: title,
          description: description || '',
          image_url: 'data:image/jpeg;base64,STORED_SEPARATELY',
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (itemError) {
        console.error('Error creating item:', itemError);
        throw new Error(`Failed to create item: ${itemError.message}`);
      }
      
      console.log(`Created item with ID ${item.id}`);
      
      // 3. Connect the item to the order using the order_items junction table
      const { data: orderItem, error: orderItemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          item_id: item.id
        })
        .select()
        .single();
      
      if (orderItemError) {
        console.error('Error creating order-item relation:', orderItemError);
        throw new Error(`Failed to create order-item relation: ${orderItemError.message}`);
      }
      
      console.log(`Created order_item relation with ID ${orderItem.id}`);
      
      // 4. Create pricing record if needed
      const { data: pricing, error: pricingError } = await supabase
        .from('pricing')
        .insert({
          item_id: item.id,
          estimated_value: estimatedValue,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          payout_amount: sellerPayout,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (pricingError) {
        console.warn('Warning: Failed to create pricing record:', pricingError);
        // Non-fatal error, continue
      } else {
        console.log(`Created pricing record with ID ${pricing.id}`);
      }
      
      // Return success response
      return res.status(200).json({
        success: true,
        message: 'Item successfully submitted',
        data: {
          order: {
            id: order.id,
            orderNumber: order.order_number,
            status: order.status
          },
          item: {
            id: item.id,
            referenceId: item.reference_id,
            title: item.title,
            status: item.status
          }
        }
      });
      
    } catch (error) {
      console.error('Database error during intake process:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Database error during item submission',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      });
    }
    
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: error.errors
      });
    }
    
    console.error('Error processing intake:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process item submission'
    });
  }
});

export default router;