/**
 * Dashboard Intake Route - Simplified In-Memory Implementation
 * This implementation processes consignment item submissions and returns mock responses
 */

import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../../storage';

const router = Router();

// Schema for validating intake requests
const intakeRequestSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  imageBase64: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  condition: z.string().optional()
});

// Generate a unique reference ID for items
function generateReferenceId(): string {
  const timestamp = Date.now().toString(36);
  const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DT-${timestamp}-${randomChars}`;
}

// Generate an order number
function generateOrderNumber(): string {
  const prefix = 'ORD';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
}

// Calculate commission and payout amounts
function calculateCommissionAndPayout(estimatedValue: number): {
  commissionRate: number;
  commissionValue: number;
  payoutValue: number;
} {
  const commissionRate = 30; // 30% commission
  const commissionValue = Math.round(estimatedValue * (commissionRate / 100));
  const payoutValue = estimatedValue - commissionValue;
  
  return { 
    commissionRate,
    commissionValue,
    payoutValue
  };
}

// POST endpoint for item intake
router.post('/', async (req, res) => {
  try {
    console.log('Received dashboard intake request');
    
    // Extract customer ID from authenticated session or JWT token
    const customerId = req.user?.id || 
                       (req.isAuthenticated() && req.session?.passport?.user) || 
                       (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') && 
                        JSON.parse(Buffer.from(req.headers.authorization.split(' ')[1].split('.')[1], 'base64').toString()).id);
    
    if (!customerId) {
      console.log('No customer ID found in session or token');
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required: You must be logged in to submit items" 
      });
    }
    
    console.log(`Processing intake for customer ID: ${customerId}`);
    
    // Validate request body
    const validationResult = intakeRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.log('Validation failed:', validationResult.error.errors);
      return res.status(400).json({ 
        success: false,
        message: "Invalid request data",
        errors: validationResult.error.errors
      });
    }
    
    const { title, description, imageBase64 } = validationResult.data;
    
    try {
      // Using in-memory storage instead of database transaction
      
      // We'll use the numeric customer ID from the authentication
      console.log(`Using customer identifier: ${customerId}`);
      
      // Set default estimated values
      const defaultEstimatedValue = 5000; // €50.00
      const { commissionRate, payoutValue } = calculateCommissionAndPayout(defaultEstimatedValue);
      
      // Generate order data
      const orderNumber = generateOrderNumber();
      const orderId = Math.floor(Math.random() * 1000) + 1; // Random order ID for in-memory storage
      
      console.log(`Created simulated order with ID: ${orderId} and number: ${orderNumber}`);
      
      // Generate item data
      const referenceId = generateReferenceId();
      const itemId = Math.floor(Math.random() * 1000) + 1; // Random item ID for in-memory storage
      
      console.log(`Created simulated item with ID: ${itemId} and reference: ${referenceId}`);
      
      // If image was provided, log it
      let imageUrl = null;
      if (imageBase64) {
        // For now, just log that we received an image
        console.log('Received image data, length:', imageBase64.length);
        imageUrl = `image_${itemId}.jpg`; // Placeholder URL
      }
      
      // Return success response
      return res.status(201).json({
        success: true,
        message: "Item submitted successfully",
        data: {
          itemId,
          orderId,
          reference: referenceId,
          title,
          description,
          imageUrl
        }
      });
    } catch (error) {
      console.error('Error in dashboard intake:', error);
      
      return res.status(500).json({
        success: false,
        message: "Failed to process item submission",
        error: error.message || "Unknown error"
      });
    }
  } catch (error) {
    console.error('Unhandled error in intake endpoint:', error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
      error: error.message || "Unknown error"
    });
  }
});

export default router;