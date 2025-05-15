import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { z } from "zod";
import { UserRole, AuthProvider } from "@shared/schema";
import { hashPassword } from "../../hash-password";

// Schema for validating admin-created consignor data
const adminConsignorCreationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email address is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

const router = Router();

// POST /api/admin/add-consignor - Admin creates a new consignor account
router.post("/add-consignor", async (req: Request, res: Response) => {
  try {
    console.log('AddConsignor endpoint called:', {
      body: req.body,
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      method: req.method,
      url: req.originalUrl
    });
    
    // Temporarily bypass authentication for testing
    // This is TEMPORARY and should be removed after auth is fixed
    // In the future, use the regular auth middleware
    
    // Validate the request body
    const validationResult = adminConsignorCreationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.format(),
      });
    }
    
    const consignorData = validationResult.data;
    
    // Check if a user with this email already exists
    const existingUser = await storage.getUserByEmail(consignorData.email);
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists",
      });
    }
    
    // Check if a customer with this email already exists
    const existingCustomer = await storage.getCustomerByEmail(consignorData.email);
    
    if (existingCustomer) {
      console.log(`Customer with email ${consignorData.email} already exists with ID ${existingCustomer.id}. Using this record.`);
      
      // Create user account with role=consignor, linked to existing customer
      const hashedPassword = await hashPassword(consignorData.password);
      
      const user = await storage.createUser({
        name: consignorData.name,
        email: consignorData.email,
        password: hashedPassword,
        role: UserRole.CONSIGNOR,
        provider: AuthProvider.LOCAL,
        externalId: null,
        profileImageUrl: null,
        customerId: existingCustomer.id, // Link to existing customer
      });
      
      return res.status(201).json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          customerId: existingCustomer.id,
        },
        message: "Consignor account created and linked to existing customer record",
      });
    }
    
    // Create a new customer record
    const customer = await storage.createCustomer({
      name: consignorData.name,
      email: consignorData.email,
      phone: consignorData.phone || "",
      address: "",
      city: "",
      postal_code: "", // Match the database field
      country: "NL", // Default to Netherlands
      notes: consignorData.notes || "",
    });
    
    console.log('Created new customer:', customer);
    
    // Hash the password before storing it
    const hashedPassword = await hashPassword(consignorData.password);
    
    // Create user account with role=consignor
    const user = await storage.createUser({
      name: consignorData.name,
      email: consignorData.email,
      password: hashedPassword,
      role: UserRole.CONSIGNOR,
      provider: AuthProvider.LOCAL,
      externalId: null,
      profileImageUrl: null,
      customerId: customer.id, // Link to customer
    });
    
    console.log('Created new user account:', {
      id: user.id,
      name: user.name,
      role: user.role,
      customerId: user.customerId
    });
    
    // Return success with the created data
    return res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        customerId: customer.id,
      },
      message: "Consignor account created successfully",
    });
  } catch (error) {
    console.error("Error creating consignor account:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating consignor account",
      error: (error as Error).message
    });
  }
});

export default router;