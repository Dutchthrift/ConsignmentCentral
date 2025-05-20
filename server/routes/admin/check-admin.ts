import { Request, Response, Router } from 'express';

// Simple admin check route
export function registerAdminCheckRoutes(router: Router) {
  router.get('/api/admin/check', (req: Request, res: Response) => {
    try {
      // Check if user exists and is authenticated
      if (req.user && (req.user as any).isAdmin) {
        return res.status(200).json({
          success: true,
          message: 'Admin authenticated',
          user: {
            id: (req.user as any).id,
            email: (req.user as any).email,
            name: (req.user as any).name,
            role: (req.user as any).role,
          }
        });
      }
      
      // Fallback for development - return admin info
      if (process.env.NODE_ENV !== 'production') {
        return res.status(200).json({
          success: true,
          message: 'Development admin authenticated',
          user: {
            id: 1,
            email: 'admin@dutchthrift.com',
            name: 'Admin User',
            role: 'admin'
          }
        });
      }
      
      // Not authenticated
      return res.status(401).json({
        success: false,
        message: 'Not authenticated as admin'
      });
    } catch (error) {
      console.error('Admin check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error checking admin status'
      });
    }
  });
  
  // Return router for chaining
  return router;
}