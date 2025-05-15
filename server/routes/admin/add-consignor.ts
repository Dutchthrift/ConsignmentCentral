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
    
    // Create a new customer record first
    const customer = await storage.createCustomer({
      name: consignorData.name,
      email: consignorData.email,
      phone: consignorData.phone || "",
      address: "",
      city: "",
      postalCode: "", // Fixed field name to match schema
      country: "NL", // Default to Netherlands
      status: "active",
      notes: consignorData.notes || "",
      created_at: new Date().toISOString(),
    });
    
    // Hash the password before storing it
    const hashedPassword = await hashPassword(consignorData.password);
    
    // Create user account with role=consignor
    const user = await storage.createUser({
      name: consignorData.name,
      email: consignorData.email,
      password: hashedPassword,
      role: UserRole.CONSIGNOR,
      provider: AuthProvider.LOCAL, // Fixed field name to match schema
      externalId: null, // Fixed field name to match schema
      lastLogin: new Date().toISOString(), // Fixed field name to match schema
      profileImageUrl: null,
      customerId: customer.id, // Link to customer
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
    });
  }
});

export default router;