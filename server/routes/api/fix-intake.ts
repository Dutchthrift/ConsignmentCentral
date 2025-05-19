/**
 * Fixed intake route that bypasses storage abstraction to work directly with SQL
 */

import { Router } from 'express';
import { intakeFormSchema, legacyIntakeFormSchema } from '@shared/schema';
import directIntake from '../../direct-intake';

const router = Router();

router.post('/intake', async (req, res) => {
  try {
    console.log('Received intake form data');
    
    // Try parsing using the new schema (multiple items)
    let data;
    let isLegacyFormat = false;
    
    try {
      data = intakeFormSchema.parse(req.body);
      console.log('Using new intake schema format');
    } catch (parseError) {
      console.error('Error parsing with intakeFormSchema:', parseError);
      // If that fails, try the legacy schema (single item)
      try {
        const legacyData = legacyIntakeFormSchema.parse(req.body);
        // Convert to new format
        data = {
          customer: legacyData.customer,
          items: [legacyData.item]
        };
        isLegacyFormat = true;
        console.log('Using legacy intake schema format');
      } catch (legacyParseError) {
        console.error('Error parsing with legacyIntakeFormSchema:', legacyParseError);
        // If both fail, return validation error
        return res.status(400).json({ 
          success: false,
          message: 'Validation error', 
          errors: parseError.errors 
        });
      }
    }
    
    // Process intake using our direct SQL implementation
    const result = await directIntake.processIntake(data);
    
    // Return appropriate response format based on result
    if (result.success) {
      // If using legacy format with a single item, return simplified response
      if (isLegacyFormat && result.data?.items?.length === 1) {
        return res.json({
          success: true,
          message: 'Item received successfully',
          data: {
            referenceId: result.data.items[0].referenceId,
            customerId: result.data.customer.id,
            title: result.data.items[0].title,
            status: result.data.items[0].status,
            orderNumber: result.data.order.orderNumber
          }
        });
      } else {
        // Return full response for multi-item submissions
        return res.json(result);
      }
    } else {
      // Return error response
      return res.status(500).json({
        success: false,
        message: result.message || 'Failed to process intake',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Unexpected error in intake route:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;