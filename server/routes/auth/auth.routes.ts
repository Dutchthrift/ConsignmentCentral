/**
 * Original authentication routes for Dutch Thrift
 * These are maintained for compatibility with existing code
 */
import express from 'express';
import passport from 'passport';
// Import only what we need for this file
import { requireAdminAuth } from '../../middleware/auth.middleware';
import { storage } from '../../storage';

const router = express.Router();

// Admin login
router.post('/admin/login', (req, res, next) => {
  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    req.login(user, (err) => {
      if (err) {
        return next(err);
      }
      
      // Set session data
      req.session.userId = user.id;
      req.session.userType = 'admin';
      
      return res.status(200).json({
        success: true,
        data: {
          user
        }
      });
    });
  })(req, res, next);
});

// Get current user
router.get('/me', async (req, res) => {
  if (!req.user) {
    console.log('No user found in session');
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
  
  return res.status(200).json(req.user);
});

// Export the router
export default router;