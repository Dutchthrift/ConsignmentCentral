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
    
    if (existingUser) {
      console.log("User already exists with email:", consignorData.email);
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists. Please log in instead.",
        isExistingUser: true,
      });
    }
    
    // Create or get existing customer record
    let customer;
    
    if (existingCustomer) {
      // Use the existing customer
      customer = existingCustomer;
      console.log(`Using existing customer with ID ${customer.id} for registration`);
    } else {
      // Create a new customer record
      console.log("Creating new customer record for:", consignorData.email);
      customer = await storage.createCustomer({
        name: consignorData.fullName,
        email: consignorData.email,
        phone: consignorData.phone || null,
        // Store payout details in proper fields
        address: null,
        city: null,
        state: consignorData.payoutMethod, // Store payment method in state field temporarily
        postalCode: null,
        country: "NL", // Default to Netherlands
      });
      console.log("Customer created with ID:", customer.id);
    }
    
    // Hash the password
    const hashedPassword = await authService.hashPassword(consignorData.password);
    
    // Double check if a user with this email exists (race condition protection)
    const userWithEmail = await storage.getUserByEmail(consignorData.email);
    
    if (userWithEmail) {
      console.log("Race condition detected - user already created with email:", consignorData.email);
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists. Please log in instead.",
        isExistingUser: true,
      });
    }
    
    // Create a new user account linked to this customer
    console.log("Creating new user account linked to customer ID:", customer.id);
    const newUser = await storage.createUser({
      email: consignorData.email,
      password: hashedPassword,
      name: consignorData.fullName,
      provider: AuthProvider.LOCAL,
      role: UserRole.CONSIGNOR,
      externalId: null,
      profileImageUrl: null,
      customerId: customer.id,
    });
    
    console.log("User created with ID:", newUser.id);
    
    // Auto-login the user (create a session)
    req.login(newUser, async (err) => {
      if (err) {
        console.error("Login error after registration:", err);
        return res.status(500).json({
          success: false,
          message: "Account created but login failed. Please try logging in manually.",
        });
      }
      
      // Update last login timestamp
      await storage.updateUserLastLogin(newUser.id);
      
      // Generate JWT token for API access
      const token = authService.generateToken(newUser);
      
      console.log("Login successful, returning user data and token");
      
      // Return success with the new user data and token
      return res.status(201).json({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        customerId: newUser.customerId,
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