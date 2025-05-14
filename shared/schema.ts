import { pgTable, text, serial, integer, boolean, jsonb, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define status enum for consignment items
export const ItemStatus = {
  PENDING: "pending",
  ANALYZED: "analyzed",
  SHIPPED: "shipped",
  RECEIVED: "received",
  TESTED: "tested",
  LISTED: "listed",
  SOLD: "sold",
  PAID: "paid",
} as const;

// Define payout type enum
export const PayoutType = {
  CASH: "cash",
  STORE_CREDIT: "storecredit",
} as const;

// Customer table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country").default("US"),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
});

// Consignment items table
export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  referenceId: text("reference_id").notNull().unique(), // Example: CS-20230518-001
  customerId: integer("customer_id").notNull().references(() => customers.id),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  status: text("status").notNull().default(ItemStatus.PENDING),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Analysis results table
export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => items.id),
  productType: text("product_type"),
  brand: text("brand"),
  model: text("model"),
  condition: text("condition"),
  accessories: jsonb("accessories").$type<string[]>(),
  additionalNotes: text("additional_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
  createdAt: true,
});

// Pricing information table
export const pricing = pgTable("pricing", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => items.id),
  averageMarketPrice: integer("average_market_price"), // Stored in cents
  suggestedListingPrice: integer("suggested_listing_price"), // Stored in cents
  suggestedPayout: integer("suggested_payout"), // Stored in cents
  finalSalePrice: integer("final_sale_price"), // Stored in cents, filled when sold
  finalPayout: integer("final_payout"), // Stored in cents, filled when sold
  commissionRate: integer("commission_rate"), // Percentage (e.g., 40 for 40%)
  payoutType: text("payout_type").default(PayoutType.CASH), // "cash" or "storecredit"
  storeCreditAmount: integer("store_credit_amount"), // Amount if store credit chosen (including bonus)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPricingSchema = createInsertSchema(pricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Shipping information table
export const shipping = pgTable("shipping", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => items.id),
  labelUrl: text("label_url"),
  trackingNumber: text("tracking_number"),
  carrier: text("carrier"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertShippingSchema = createInsertSchema(shipping).omit({
  id: true,
  createdAt: true,
});

// Export types
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;

export type Pricing = typeof pricing.$inferSelect;
export type InsertPricing = z.infer<typeof insertPricingSchema>;

export type Shipping = typeof shipping.$inferSelect;
export type InsertShipping = z.infer<typeof insertShippingSchema>;

// Enhanced Types for API Responses
export type ItemWithDetails = Item & {
  customer: Customer;
  analysis?: Analysis;
  pricing?: Pricing;
  shipping?: Shipping;
};

// Schema for intake form submission
export const intakeFormSchema = z.object({
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }),
  item: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    imageUrl: z.string().url().optional(),
    imageBase64: z.string().optional(),
  }),
});

export type IntakeFormData = z.infer<typeof intakeFormSchema>;

// Schema for Shopify order webhook
export const orderWebhookSchema = z.object({
  id: z.number(),
  order_number: z.string(),
  created_at: z.string(),
  line_items: z.array(
    z.object({
      id: z.number(),
      product_id: z.number(),
      variant_id: z.number(),
      title: z.string(),
      price: z.string(),
      properties: z.array(
        z.object({
          name: z.string(),
          value: z.string(),
        })
      ).optional(),
    })
  ),
  total_price: z.string(),
});

export type OrderWebhookData = z.infer<typeof orderWebhookSchema>;

// Schema for dashboard statistics
export const dashboardStatsSchema = z.object({
  totalIntakes: z.number(),
  pendingAnalysis: z.number(),
  activeListings: z.number(),
  soldItems: z.number(),
  totalRevenue: z.number().optional(),
  monthlySalesData: z.array(z.object({
    month: z.string(),
    sales: z.number(),
  })).optional(),
  statusDistribution: z.array(z.object({
    status: z.string(),
    count: z.number(),
  })).optional(),
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Schema for commission tiers
export const commissionTierSchema = z.object({
  tier1Rate: z.number(), // 50-99.99 EUR → 50%
  tier2Rate: z.number(), // 100-199.99 EUR → 40%
  tier3Rate: z.number(), // 200-499.99 EUR → 30%
  tier4Rate: z.number(), // 500+ EUR → 20%
  storeCreditBonus: z.number(), // Bonus percentage for store credit (default: 10%)
  minimumValue: z.number(), // Minimum value for consignment (default: 50 EUR)
});

export const commissionSettingsSchema = z.object({
  tiers: commissionTierSchema,
  storeCreditEnabled: z.boolean(),
  directBuyoutEnabled: z.boolean(),
  recyclingEnabled: z.boolean(),
});

export type CommissionTiers = z.infer<typeof commissionTierSchema>;
export type CommissionSettings = z.infer<typeof commissionSettingsSchema>;

// Schema for payout options
export const payoutOptionsSchema = z.object({
  type: z.enum([PayoutType.CASH, PayoutType.STORE_CREDIT]),
  amount: z.number(),
  bonus: z.number().optional(),
  total: z.number(),
});

export type PayoutOptions = z.infer<typeof payoutOptionsSchema>;

// Schema for consignor dashboard view
export const consignorDashboardSchema = z.object({
  consignor: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    totalItems: z.number(),
    totalSales: z.number(),
  }),
  items: z.array(z.object({
    id: z.number(),
    referenceId: z.string(),
    title: z.string(),
    imageUrl: z.string().optional(),
    status: z.string(),
    createdAt: z.string(),
    estimatedPrice: z.number().optional(),
    commissionRate: z.number().optional(),
    payoutAmount: z.number().optional(),
    payoutType: z.enum([PayoutType.CASH, PayoutType.STORE_CREDIT]).optional(),
    finalSalePrice: z.number().optional(),
  })),
});

export type ConsignorDashboard = z.infer<typeof consignorDashboardSchema>;
