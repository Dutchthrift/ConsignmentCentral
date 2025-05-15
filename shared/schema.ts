import { pgTable, text, serial, integer, boolean, jsonb, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Define status enum for consignment items
export const ItemStatus = {
  PENDING: "pending",
  ANALYZED: "analyzed",
  REJECTED: "rejected", // For items that are below minimum value
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

// Schema for a single item in the intake form
export const intakeItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional(),
});

export type IntakeItem = z.infer<typeof intakeItemSchema>;

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
  items: z.array(intakeItemSchema).min(1),
});

// Legacy schema for backward compatibility
export const legacyIntakeFormSchema = z.object({
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
  item: intakeItemSchema,
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
export const statusDistributionItemSchema = z.object({
  status: z.string(),
  count: z.number()
});

export const monthlySalesItemSchema = z.object({
  month: z.string(),
  sales: z.number()
});

export const dashboardStatsSchema = z.object({
  totalIntakes: z.number(),
  pendingAnalysis: z.number(),
  activeListings: z.number(),
  soldItems: z.number(),
  totalRevenue: z.number().optional(),
  monthlySalesData: z.array(monthlySalesItemSchema).optional(),
  statusDistribution: z.array(statusDistributionItemSchema).optional(),
});

export type StatusDistributionItem = z.infer<typeof statusDistributionItemSchema>;
export type MonthlySalesItem = z.infer<typeof monthlySalesItemSchema>;
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

// ML Training Examples table
export const mlTrainingExamples = pgTable("ml_training_examples", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => items.id),
  imageUrl: text("image_url"),
  imageData: text("image_data"), // Base64 encoded image data
  productType: text("product_type").notNull(),
  brand: text("brand"),
  model: text("model"),
  condition: text("condition"),
  marketValue: integer("market_value"), // Value in cents 
  isVerified: boolean("is_verified").default(false), // Whether this example has been verified by an admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMlTrainingExampleSchema = createInsertSchema(mlTrainingExamples).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ML Model Configurations table
export const mlModelConfigs = pgTable("ml_model_configs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  modelId: text("model_id"), // OpenAI fine-tuned model ID
  baseModel: text("base_model").notNull(), // e.g., "gpt-4o"
  trainingParams: jsonb("training_params"), // Training parameters 
  specialization: text("specialization").notNull(), // e.g., "electronics", "fashion", "collectibles"
  accuracy: integer("accuracy"), // Accuracy score (percentage)
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMlModelConfigSchema = createInsertSchema(mlModelConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ML Model Training Sessions table
export const mlTrainingSessions = pgTable("ml_training_sessions", {
  id: serial("id").primaryKey(),
  modelConfigId: integer("model_config_id").references(() => mlModelConfigs.id),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  status: text("status").notNull().default("pending"), // pending, training, completed, failed
  trainingExampleCount: integer("training_example_count").default(0),
  validationExampleCount: integer("validation_example_count").default(0),
  trainingLoss: text("training_loss"),
  validationLoss: text("validation_loss"),
  notes: text("notes"),
  resultData: jsonb("result_data"), // JSON with training results
});

export const insertMlTrainingSessionSchema = createInsertSchema(mlTrainingSessions).omit({
  id: true,
  startedAt: true,
});

export type MlTrainingExample = typeof mlTrainingExamples.$inferSelect;
export type InsertMlTrainingExample = z.infer<typeof insertMlTrainingExampleSchema>;

export type MlModelConfig = typeof mlModelConfigs.$inferSelect;
export type InsertMlModelConfig = z.infer<typeof insertMlModelConfigSchema>;

export type MlTrainingSession = typeof mlTrainingSessions.$inferSelect;
export type InsertMlTrainingSession = z.infer<typeof insertMlTrainingSessionSchema>;

// User roles
export const UserRole = {
  CONSIGNOR: "consignor",
  ADMIN: "admin"
} as const;

// Auth Providers
export const AuthProvider = {
  GOOGLE: "google",
  APPLE: "apple",
  LOCAL: "local"
} as const;

// User authentication table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  externalId: text("external_id"), // Auth provider's user ID
  email: text("email").notNull().unique(),
  password: text("password"), // Only for local auth
  name: text("name").notNull(),
  role: text("role").notNull().default(UserRole.CONSIGNOR),
  provider: text("provider").notNull(), // google, apple, local, etc.
  profileImageUrl: text("profile_image_url"),
  lastLogin: timestamp("last_login").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  customerId: integer("customer_id").references(() => customers.id),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastLogin: true,
  createdAt: true,
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  customer: one(customers, {
    fields: [users.customerId],
    references: [customers.id],
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  users: many(users),
  items: many(items),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  customer: one(customers, {
    fields: [items.customerId],
    references: [customers.id],
  }),
  analysis: one(analyses, {
    fields: [items.id],
    references: [analyses.itemId],
  }),
  pricing: one(pricing, {
    fields: [items.id],
    references: [pricing.itemId],
  }),
  shipping: one(shipping, {
    fields: [items.id],
    references: [shipping.itemId],
  }),
}));

// Session table for express-session with connect-pg-simple
export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
