import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// JWT Secret - should match the one in auth service
const JWT_SECRET = process.env.JWT_SECRET || 'dutch-thrift-jwt-secret';

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  // Check for token in Authorization header
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string; type: string };
      
      // Attach user info to request for route handlers to use
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        type: decoded.type,
        isAdmin: decoded.type === 'admin'
      };
      
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // First authenticate the JWT
  authenticateJWT(req, res, (err) => {
    if (err) return next(err);
    
    // Check if user is an admin
    if (req.user && (req.user as any).isAdmin) {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Admin access required' });
    }
  });
}