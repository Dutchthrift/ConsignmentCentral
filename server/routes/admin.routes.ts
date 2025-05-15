import { Router, Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Middleware to check if user is admin
router.use(requireAdmin);

// Get admin dashboard statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await storage.getAdminStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch admin statistics' 
    });
  }
});

// Get all consignors with their details (this is a more detailed version than the one in admin.ts)
router.get('/consignors-detailed', async (req: Request, res: Response) => {
  try {
    const users = await storage.getUsersByRole('consignor');
    
    // For each consignor, fetch their customer details if they have any
    const consignorsWithDetails = await Promise.all(
      users.map(async (user) => {
        if (user.customerId) {
          const customer = await storage.getCustomer(user.customerId);
          return {
            ...user,
            customer
          };
        }
        return user;
      })
    );
    
    res.json({
      success: true,
      data: consignorsWithDetails
    });
  } catch (error) {
    console.error('Error fetching consignors:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch consignors' 
    });
  }
});

// Get a specific consignor's detailed information (more detailed than the one in admin.ts)
router.get('/consignor-details/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID' 
      });
    }
    
    const consignorDetails = await storage.getConsignorDetails(userId);
    
    if (!consignorDetails) {
      return res.status(404).json({ 
        success: false, 
        message: 'Consignor not found' 
      });
    }
    
    res.json({
      success: true,
      data: consignorDetails
    });
  } catch (error) {
    console.error('Error fetching consignor details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch consignor details' 
    });
  }
});

export default router;