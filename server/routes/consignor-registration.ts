import { Request, Response, Router, NextFunction } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { UserRole, AuthProvider } from "@shared/schema";
import AuthService from "../services/auth.service";

// Create an instance of AuthService
const authService = new AuthService(storage);

const router = Router();

// Schema for validating consignor registration data
const consignorRegistrationSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  passwordConfirm: z.string().min(6, "Password confirmation is required"),
  payoutMethod: z.enum(["bank", "credit"]),
  iban: z.string().optional(),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions",
  }),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords do not match",
  path: ["passwordConfirm"],
});

// POST /api/consignors/register - Register a new consignor
router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Set correct content type header to ensure JSON response
    res.setHeader('Content-Type', 'application/json');
    
    console.log("Consignor registration request received with data:", { 
      email: req.body?.email,
      hasFullName: !!req.body?.fullName,
      hasPassword: !!req.body?.password
    });
    
    // Validate the request body
    const validationResult = consignorRegistrationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      console.log("Validation failed:", validationResult.error.format());
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.format(),
      });
    }
    
    const consignorData = validationResult.data;
    
    console.log("Validated consignor data:", { 
      email: consignorData.email,
      payoutMethod: consignorData.payoutMethod
    });
    
    // Check if a user or customer with this email already exists
    const existingUser = await storage.getUserByEmail(consignorData.email);
    const existingCustomer = await storage.getCustomerByEmail(consignorData.email);
    
    if (existingUser || existingCustomer) {
      console.log("User/Customer already exists with email:", consignorData.email);
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists. Please log in instead.",
        isExistingUser: true,
      });
    }
    
    // Create a new customer record directly with proper fields
    // Hash the password
    const hashedPassword = await authService.hashPassword(consignorData.password);
    
    // Create a new customer record (now handles their own authentication)
    console.log("Creating new customer record for:", consignorData.email);
    const customer = await storage.createCustomer({
      fullName: consignorData.fullName,
      email: consignorData.email,
      password: hashedPassword,
      phone: consignorData.phone || null,
      payoutMethod: consignorData.payoutMethod,
      iban: consignorData.iban || null,
      address: null,
      city: null,
      country: "NL", // Default to Netherlands
      role: UserRole.CONSIGNOR,
    });
    console.log("Customer created with ID:", customer.id);
    
    // Auto-login the customer (create a session)
    // Since we've simplified our auth model, we now use the customer as the authenticated user
    console.log("Creating session for new customer ID:", customer.id);
    
    req.login(customer, async (err) => {
      if (err) {
        console.error("Login error after registration:", err);
        return res.status(500).json({
          success: false,
          message: "Account created but login failed. Please try logging in manually.",
        });
      }
      
      // Generate JWT token for API access
      const token = authService.generateToken(customer);
      
      console.log("Login successful, returning customer data and token");
      
      // Return success with the new customer data and token
      return res.status(201).json({
        id: customer.id,
        email: customer.email,
        fullName: customer.fullName, // Using fullName instead of name to match schema
        role: customer.role,
        token,
        success: true,
        message: "Consignor account created successfully",
      });
    });
  } catch (error: any) {
    console.error("Error registering consignor:", error);
    
    // Set content type even in error case
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(500).json({
      success: false,
      message: error?.message || "An error occurred while registering the consignor",
    });
  }
});

export default router;