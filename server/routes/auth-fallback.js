import express from 'express';
import bcrypt from 'bcrypt';
import memStore from '../auth-mem-store.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// In-memory JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'dutch-thrift-jwt-secret';
const TOKEN_EXPIRY = '7d'; // Token valid for 7 days

// Generate a JWT token for any user
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    console.log("Fallback login attempt:", req.body.email);
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }
    
    // Try admin login first
    let user = await memStore.getAdminUserByEmail(email);
    let isAdmin = true;
    
    // If admin not found, try regular user
    if (!user) {
      user = await memStore.getUserByEmail(email);
      isAdmin = false;
    }
    
    // If no user found at all
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Incorrect email or password" 
      });
    }
    
    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Incorrect email or password"
      });
    }
    
    // Update last login time
    if (isAdmin) {
      await memStore.updateAdminUserLastLogin(user.id);
    } else {
      await memStore.updateUserLastLogin(user.id);
    }
    
    // Set up session
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Session error"
        });
      }
      
      // Generate JWT token
      const token = generateToken(user);
      
      // Get customer info if this is a consignor
      const getCustomerPromise = (!isAdmin && user.role === 'consignor')
        ? memStore.getCustomerByEmail(user.email)
        : Promise.resolve(null);
      
      // Add customer info if available
      getCustomerPromise.then(customer => {
        // Prepare response
        const userData = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
        
        if (customer) {
          userData.customerId = customer.id;
        }
        
        return res.status(200).json({
          success: true,
          token,
          user: userData
        });
      });
    });
  } catch (error) {
    console.error("Fallback login error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error"
    });
  }
});

// Get current user
router.get('/user', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }
  
  // Return basic user info
  return res.status(200).json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role
    }
  });
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Logout error"
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  });
});

export default router;