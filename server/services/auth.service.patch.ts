import * as authFailover from './auth-failover.js';

// This patch file adds our failover authentication methods to the existing auth service
export async function applyAuthPatch(strategy) {
  // Original verification function (from Passport LocalStrategy)
  const originalVerify = strategy._verify;
  
  // Create a new verify function that tries the failover methods if the original fails
  strategy._verify = async function(req, email, password, done) {
    try {
      // First, try the original authentication method
      await originalVerify.call(this, req, email, password, async (err, user, info) => {
        // If authentication succeeded, return the user
        if (user) {
          return done(null, user, info);
        }
        
        // If there was an error or authentication failed, try the failover methods
        console.log("Original authentication failed, trying failover authentication");
        
        // Try admin authentication first
        try {
          const adminUser = await authFailover.verifyAdminCredentials(email, password);
          if (adminUser) {
            console.log("Failover admin authentication successful:", adminUser.email);
            // Set user type in session
            if (req.session) {
              req.session.userType = 'admin';
            }
            return done(null, adminUser);
          }
        } catch (adminError) {
          console.error("Failover admin authentication error:", adminError);
        }
        
        // If admin authentication failed, try regular user authentication
        try {
          const regularUser = await authFailover.verifyUserCredentials(email, password);
          if (regularUser) {
            console.log("Failover user authentication successful:", regularUser.email);
            // Set user type in session
            if (req.session) {
              req.session.userType = regularUser.role === 'consignor' ? 'customer' : regularUser.role;
            }
            return done(null, regularUser);
          }
        } catch (userError) {
          console.error("Failover user authentication error:", userError);
        }
        
        // If all authentication methods failed, return the original error or info
        return done(err, false, info || { message: 'Authentication failed' });
      });
    } catch (error) {
      console.error("Authentication error:", error);
      return done(error);
    }
  };
  
  console.log("Auth service patched with failover authentication");
}