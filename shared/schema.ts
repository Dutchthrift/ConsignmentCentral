import { pgTable, text, serial, integer, boolean, jsonb, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define status enum for consignment items
export const ItemStatus = {
  PENDING: "pending",
  ANALYZED: "analyzed",
  SHIPPED: "shipped",
  RECEIVED: "received",
  LISTED: "listed",
  SOLD: "sold",
  PAID: "paid",
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
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
