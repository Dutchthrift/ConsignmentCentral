/**
 * Authentication middleware to protect routes
 */

export const isAuthenticated = (req, res, next) => {
  // Log session information for debugging
  const sessionInfo = {
    hasSession: !!req.session,
    userType: req.session?.userType,
    userId: req.session?.userId,
    customerId: req.session?.customerId
  };
  
  console.log('Session in middleware:', sessionInfo);
  
  if (!req.session || (!req.session.userId && !req.session.customerId)) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }
  
  next();
};

export const isAdmin = (req, res, next) => {
  // Ensure the user is authenticated and is an admin
  if (!req.session || !req.session.userId || req.session.userType !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }
  
  next();
};

export const isConsignor = (req, res, next) => {
  // Ensure the user is authenticated and is a consignor
  if (!req.session || !req.session.customerId || req.session.userType !== 'consignor') {
    return res.status(403).json({ 
      success: false, 
      message: 'Consignor access required' 
    });
  }
  
  next();
};