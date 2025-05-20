import { Router, Request, Response } from "express";
import { AuthService } from "../../services/auth.service";
import { storage } from "../../storage";

const router = Router();
const authService = new AuthService(storage);

/**
 * Get current user from session
 */
router.get("/user", (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.session || !req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated"
      });
    }

    // Get user information with userType from session
    const userId = req.session.userId;
    const userType = req.session.userType;

    if (!userId || !userType) {
      return res.status(401).json({
        success: false,
        message: "Invalid session data"
      });
    }

    // Return user data based on user type
    if (userType === "admin") {
      storage.getAdminUserById(userId)
        .then(admin => {
          if (!admin) {
            return res.status(404).json({
              success: false,
              message: "Admin user not found"
            });
          }
          return res.json({
            ...admin,
            userType: "admin"
          });
        })
        .catch(error => {
          console.error("Error fetching admin user:", error);
          return res.status(500).json({
            success: false,
            message: "Error fetching user data"
          });
        });
    } else if (userType === "consignor") {
      storage.getUserById(userId)
        .then(async user => {
          if (!user) {
            return res.status(404).json({
              success: false,
              message: "Consignor user not found"
            });
          }
          
          // Get customer data if available
          const customer = await storage.getCustomerByUserId(userId);
          
          return res.json({
            ...user,
            customer,
            userType: "consignor"
          });
        })
        .catch(error => {
          console.error("Error fetching consignor user:", error);
          return res.status(500).json({
            success: false,
            message: "Error fetching user data"
          });
        });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid user type"
      });
    }
  } catch (error) {
    console.error("Error in /user route:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/**
 * Admin login
 */
router.post("/admin/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Verify admin credentials
    const admin = await authService.verifyAdminCredentials(email, password);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Set session data
    req.session.userId = admin.id;
    req.session.userType = "admin";

    // Generate JWT token
    const token = authService.generateToken({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      isAdmin: true
    });

    // Return user data with token
    return res.json({
      ...admin,
      token,
      userType: "admin"
    });
  } catch (error) {
    console.error("Error in /admin/login route:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/**
 * Consignor login
 */
router.post("/consignor/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Verify consignor credentials
    const consignor = await authService.verifyConsignorCredentials(email, password);

    if (!consignor) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Set session data
    req.session.userId = consignor.id;
    req.session.userType = "consignor";

    // Generate JWT token
    const token = authService.generateToken({
      id: consignor.id,
      email: consignor.email,
      name: consignor.name,
      role: consignor.role,
      isAdmin: false
    });

    // Return user data with token
    return res.json({
      ...consignor,
      token,
      userType: "consignor"
    });
  } catch (error) {
    console.error("Error in /consignor/login route:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/**
 * Consignor registration
 */
router.post("/consignor/register", async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Register new consignor
    const result = await authService.registerConsignor(email, password, firstName, lastName);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    // Set session data
    req.session.userId = result.user.id;
    req.session.userType = "consignor";

    // Generate JWT token
    const token = authService.generateToken({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      isAdmin: false
    });

    // Return user data with token
    return res.status(201).json({
      ...result.user,
      token,
      userType: "consignor"
    });
  } catch (error) {
    console.error("Error in /consignor/register route:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/**
 * Logout
 */
router.post("/logout", (req: Request, res: Response) => {
  try {
    // Clear session
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({
          success: false,
          message: "Error logging out"
        });
      }
      
      return res.json({
        success: true,
        message: "Logged out successfully"
      });
    });
  } catch (error) {
    console.error("Error in /logout route:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

export default router;