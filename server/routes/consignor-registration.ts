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
    // Validate the request body
    const validationResult = consignorRegistrationSchema.safeParse(req.body);
    
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
        message: "A user with this email already exists. Please log in instead.",
        isExistingUser: true,
      });
    }
    
    // Create a new customer record with the consignor information
    const newCustomer = await storage.createCustomer({
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
    
    // Hash the password
    const hashedPassword = await authService.hashPassword(consignorData.password);
    
    // Create a new user account linked to this customer
    const newUser = await storage.createUser({
      email: consignorData.email,
      password: hashedPassword,
      name: consignorData.fullName,
      provider: AuthProvider.LOCAL,
      role: UserRole.CONSIGNOR,
      externalId: null,
      profileImageUrl: null,
      customerId: newCustomer.id,
    });
    
    // Auto-login the user (create a session)
    req.login(newUser, async (err) => {
      if (err) {
        console.error("Login error after registration:", err);
        return next(err);
      }
      
      // Update last login timestamp
      await storage.updateUserLastLogin(newUser.id);
      
      // Generate JWT token for API access
      const token = authService.generateToken(newUser);
      
      // Return success with the new user data and token
      return res.status(201).json({
        ...newUser,
        token,
        success: true,
        message: "Consignor account created successfully",
      });
    });
  } catch (error) {
    console.error("Error registering consignor:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while registering the consignor",
    });
  }
});

export default router;