/**
 * New Dashboard Intake Route
 * A clean implementation of the item intake process
 */

import { Router } from 'express';
import { z } from 'zod';
import { processItemIntake } from '../../services/intake-service';

const router = Router();

// Define intake request schema
const intakeRequestSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  imageBase64: z.string().min(1, "Image is required")
});

// POST /api/dashboard/intake - Submit a new item
router.post('/intake', async (req, res) => {
  try {
    console.log('Received intake request');
    
    // Extract customer ID from authenticated session
    const customerId = req.user?.id || (req.isAuthenticated() && req.session?.passport?.user);
    if (!customerId) {
      return res.status(401).json({ 
        success: false, 
        message: "You must be logged in to submit items" 
      });
    }
    
    // Validate request body
    const validationResult = intakeRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid request data",
        errors: validationResult.error.errors
      });
    }
    
    // Process the intake
    const result = await processItemIntake(customerId, validationResult.data);
    
    return res.json(result);
  } catch (error) {
    console.error('Error in dashboard intake route:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to process item submission",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;