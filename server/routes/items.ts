import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

// GET /api/items/:referenceId - get item details by reference ID
router.get('/:referenceId', async (req: Request, res: Response) => {
  try {
    const referenceId = req.params.referenceId;
    
    if (!referenceId) {
      return res.status(400).json({
        success: false,
        message: 'Reference ID is required'
      });
    }
    
    // Using direct SQL query to avoid column mismatches
    const { getItemDetailsByReferenceId } = await import('../getConsignorItems');
    const item = await getItemDetailsByReferenceId(referenceId);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error getting item details:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving item details'
    });
  }
});

export default router;