/**
 * Dashboard Intake Route - Simplified In-Memory Implementation
 * This implementation processes consignment item submissions and returns mock responses
 */

import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../../storage';

const router = Router();

// Define intake request schema
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
                       (req.session?.passport?.user) || 
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
    
    const { title, description, imageBase64, brand, category, condition } = validationResult.data;
    
    try {
      console.log(`Using customer identifier: ${customerId}`);
      
      // Generate reference number and create simulated data
      const referenceId = generateReferenceId();
      const orderNumber = generateOrderNumber();
      
      // Generate a random ID for the item
      const itemId = Math.floor(Math.random() * 10000) + 1;
      
      // Create a simulated response
      return res.status(201).json({
        success: true,
        message: "Item submitted successfully",
        data: {
          id: itemId,
          referenceId: referenceId,
          title: title,
          description: description || "",
          brand: brand || "Unknown",
          category: category || "Other",
          condition: condition || "Used - Good",
          customerId: customerId,
          orderNumber: orderNumber,
          status: "quoted",
          pricing: {
            estimatedValue: 5000, // €50.00
            commissionRate: 30,
            commissionValue: 1500, // €15.00
            payoutValue: 3500, // €35.00
          }
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