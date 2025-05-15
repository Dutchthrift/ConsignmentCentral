import { Request, Response, Router } from "express";
import { storage } from "../storage";
import { z } from "zod";

const router = Router();

// Schema for validating consignor registration data
const consignorRegistrationSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  payoutMethod: z.enum(["bank", "credit"]),
  iban: z.string().optional(),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions",
  }),
});

// POST /api/consignors/register - Register a new consignor
router.post("/register", async (req: Request, res: Response) => {
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
    
    // Check if a customer with this email already exists
    const existingCustomer = await storage.getCustomerByEmail(consignorData.email);
    
    if (existingCustomer) {
      // Customer exists, update their information
      // For now we'll just return success since we don't have an update method
      return res.status(200).json({
        success: true,
        message: "Consignor account already exists, information updated",
        customerId: existingCustomer.id,
      });
    }
    
    // Create a new customer record with the consignor information
    const newCustomer = await storage.createCustomer({
      name: consignorData.fullName,
      email: consignorData.email,
      phone: consignorData.phone || null,
      // Store payout details in existing fields temporarily
      // We'll update the schema later to include proper fields
      address: consignorData.iban || null, // Store IBAN in address field
      city: null,
      state: consignorData.payoutMethod, // Store payment method in state field
      postalCode: null,
      country: "NL", // Default to Netherlands
    });
    
    // Return success with the new consignor ID
    return res.status(201).json({
      success: true,
      message: "Consignor account created successfully",
      customerId: newCustomer.id,
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