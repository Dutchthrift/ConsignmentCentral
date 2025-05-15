import { Router } from 'express';
import { storage } from '../storage';
import { AuthService } from '../services/auth.service';

const router = Router();
const authService = new AuthService(storage);

// Route to test token verification without middleware
router.post('/verify-token', async (req, res) => {
  try {
    console.log('Received token verification request:', { body: req.body });
    
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }
    
    // First, verify the token
    console.log('Verifying token...');
    const decoded = authService.verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        decoded: null
      });
    }
    
    console.log('Token verified, decoded content:', decoded);
    
    // Check if it's an admin token
    if (decoded.isAdmin) {
      console.log('Checking for admin user with id:', decoded.id);
      const adminUser = await storage.getAdminUserById(decoded.id);
      
      if (adminUser) {
        return res.json({
          success: true,
          message: 'Valid admin token',
          user: {
            id: adminUser.id,
            email: adminUser.email,
            role: adminUser.role,
            userType: 'admin'
          },
          decoded
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'Admin user not found',
          decoded
        });
      }
    } else {
      // Check regular user
      console.log('Checking for regular user with id:', decoded.id);
      const user = await storage.getUserById(decoded.id);
      
      if (user) {
        return res.json({
          success: true,
          message: 'Valid user token',
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            userType: 'user'
          },
          decoded
        });
      } else {
        // Try customer
        console.log('Checking for customer with id:', decoded.id);
        const customer = await storage.getCustomer(decoded.id);
        
        if (customer) {
          return res.json({
            success: true,
            message: 'Valid customer token',
            user: {
              id: customer.id,
              email: customer.email,
              role: customer.role,
              userType: 'customer'
            },
            decoded
          });
        } else {
          return res.status(404).json({
            success: false,
            message: 'User not found',
            decoded
          });
        }
      }
    }
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: String(error)
    });
  }
});

export default router;