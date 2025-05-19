import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

/**
 * Special demo login route that allows authentication when database is unavailable
 * Only works with specific demo credentials
 */
router.post('/', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  console.log('Demo login attempt:', { email });
  
  // Only allow specific demo credentials - NEVER use this in production!
  if (email === 'admin@dutchthrift.com' && password === 'admin123') {
    // Create a JWT token with admin privileges
    const token = jwt.sign(
      { 
        id: 1, 
        email: 'admin@dutchthrift.com', 
        role: 'admin',
        name: 'Admin User',
        isAdmin: true 
      },
      process.env.JWT_SECRET || 'dutch-thrift-secret-key',
      { expiresIn: '7d' }
    );
    
    // Log the successful login
    console.log('Demo admin login successful');
    
    // Return the token
    return res.status(200).json({
      success: true,
      data: {
        id: 1,
        email: 'admin@dutchthrift.com',
        role: 'admin',
        name: 'Admin User',
        token
      }
    });
  }
  
  // Demo consignor login
  if (email === 'theooenema@hotmail.com' && password === 'password123') {
    // Create a JWT token with consignor privileges
    const token = jwt.sign(
      { 
        id: 2, 
        email: 'theooenema@hotmail.com', 
        role: 'consignor',
        name: 'Theo Oenema',
        isAdmin: false 
      },
      process.env.JWT_SECRET || 'dutch-thrift-secret-key',
      { expiresIn: '7d' }
    );
    
    // Log the successful login
    console.log('Demo consignor login successful');
    
    // Return the token
    return res.status(200).json({
      success: true,
      data: {
        id: 2,
        email: 'theooenema@hotmail.com',
        role: 'consignor',
        name: 'Theo Oenema',
        token
      }
    });
  }
  
  // If credentials don't match, return error
  return res.status(401).json({
    success: false,
    message: 'Invalid email or password'
  });
});

export default router;