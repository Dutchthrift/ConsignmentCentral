import { pgTable, text, serial, integer, boolean, jsonb, timestamp, varchar, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User roles
export const UserRole = {
  CONSIGNOR: "consignor",
  ADMIN: "admin"
} as const;

// User types
export const UserType = {
  ADMIN: "admin",
  CUSTOMER: "customer"
} as const;

// Auth Providers
export const AuthProvider = {
  GOOGLE: "google",
  APPLE: "apple",
  LOCAL: "local"
} as const;

// Define status enum for consignment items
export const ItemStatus = {
  PENDING: "pending",
  ANALYZED: "analyzed",
  REJECTED: "rejected", // For items that are below minimum value
  APPROVED: "approved", // Admin has approved the item for listing
  LISTED: "listed", // Item is listed for sale
  SOLD: "sold", // Item has been sold
  SHIPPED: "shipped", // Item has been shipped to buyer
  COMPLETED: "completed", // Transaction complete
  RETURNED: "returned", // Failed to sell, returned to consignor
} as const;

// Define payout options for consignors
export const PayoutType = {
  BANK: "bank",
  CASH: "cash",
  STORE_CREDIT: "storecredit",
} as const;

// Users table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password"),  // Hashed password (null for OAuth/Supabase accounts)
  name: text("name").notNull(),
  role: text("role").notNull().default(UserRole.CONSIGNOR),
  provider: text("provider").default(AuthProvider.LOCAL), // google, apple, local, supabase
  created_at: timestamp("created_at").defaultNow().notNull(),
  last_login: timestamp("last_login"),
  external_id: text("external_id"), // ID from external provider
  profile_image_url: text("profile_image_url"), // Avatar URL
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  created_at: true,
  last_login: true,
});

// Customer table (for consignors)
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  email: text("email").notNull().unique(),
  password: text("password"), // Hashed password for authentication
  name: text("name").notNull(), // Single name field instead of first/last name
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"), // This is used for payout method
  postal_code: text("postal_code"), // This is used for IBAN
  country: text("country").default("NL"),
  company_name: text("company_name"),
  vat_number: text("vat_number"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
});

// Item table
export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  referenceId: text("reference_id").unique().notNull(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  title: text("title"),
  description: text("description"),
  category: text("category"),
  status: text("status").notNull().default(ItemStatus.PENDING),
  imageUrl: text("image_urls"), // Changed to image_urls based on error message
  createdAt: timestamp("created_at").defaultNow(), // Using created_at field from DB
  updatedAt: timestamp("updated_at").defaultNow(), // Using updated_at field from DB
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Analysis table
export const analyses = pgTable("analysis", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => items.id),
  brand: text("brand"),
  productType: text("product_type"),
  model: text("model"),
  condition: text("condition"),
  category: text("category"),
  features: jsonb("features"), // Array of product features
  accessories: jsonb("accessories"), // Array of included accessories
  manufactureYear: text("manufacture_year"),
  color: text("color"),
  dimensions: text("dimensions"),
  weight: text("weight"),
  materials: text("materials"),
  authenticity: text("authenticity"),
  rarity: text("rarity"),
  additionalNotes: text("additional_notes"),
  analysisSummary: text("analysis_summary"),
  confidenceScore: numeric("confidence_score", { precision: 4, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
  createdAt: true,
});

// Pricing table
export const pricing = pgTable("pricing", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => items.id),
  averageMarketPrice: integer("average_market_price"),
  suggestedListingPrice: integer("suggested_listing_price"),
  commissionRate: integer("commission_rate"),
  suggestedPayout: integer("suggested_payout"),
  finalSalePrice: integer("final_sale_price"),
  finalPayout: integer("final_payout"),
  payoutType: text("payout_type"),
  storeCreditAmount: integer("store_credit_amount"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const insertPricingSchema = createInsertSchema(pricing).omit({
  id: true,
  createdAt: true,
});

// Shipping table
export const shipping = pgTable("shipping", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => items.id),
  trackingNumber: text("tracking_number"),
  carrier: text("carrier"),
  labelUrl: text("label_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertShippingSchema = createInsertSchema(shipping).omit({
  id: true,
  createdAt: true,
});

// Order status enum
export const OrderStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

// Order table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").unique().notNull(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  status: text("status").notNull().default(OrderStatus.PENDING),
  submissionDate: timestamp("submission_date").defaultNow().notNull(),
  totalAmount: integer("total_amount"),
  payoutAmount: integer("payout_amount"),
  trackingCode: text("tracking_code"),
  shippingAddress: text("shipping_address"),
  shippingCity: text("shipping_city"),
  shippingState: text("shipping_state"),
  shippingPostalCode: text("shipping_postal_code"),
  shippingCountry: text("shipping_country"),
  notes: text("notes"),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  submissionDate: true,
});

// Junction table for order items
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  itemId: integer("item_id").notNull().references(() => items.id),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

// Type definitions
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

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

// Composite types
export type ItemWithDetails = Item & {
  customer: Customer;
  analysis?: Analysis;
  pricing?: Pricing;
  shipping?: Shipping;
};

export type OrderWithDetails = Order & {
  customer: Customer;
  items: (Item & {
    pricing?: Pricing;
    shipping?: Shipping;
    analysis?: Analysis;
  })[];
};

export type OrderSummary = {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  submissionDate: string;
  status: string;
  trackingCode?: string;
  totalValue: number;
  totalPayout: number;
  itemCount: number;
};

// Validation schemas for API requests
export const intakeItemSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  condition: z.string().optional(),
  images: z.array(z.string()).optional(),
  imageBase64: z.string().optional(), // Add support for base64 encoded image
});

export type IntakeItem = z.infer<typeof intakeItemSchema>;

// New schema format that matches the frontend's structure
export const intakeFormSchema = z.object({
  customer: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().default("NL"),
  }),
  items: z.array(intakeItemSchema).default([]),
  sessionId: z.string().optional(),
});

// For legacy single-item submissions
export const legacyIntakeFormSchema = z.object({
  customer: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().default("NL"),
  }),
  item: z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    brand: z.string().optional(),
    category: z.string().optional(),
    condition: z.string().optional(),
    imageBase64: z.string().optional(), // Add support for base64 encoded image
  }),
});

export type IntakeFormData = z.infer<typeof intakeFormSchema>;

// Webhook schema for incoming orders
export const orderWebhookSchema = z.object({
  id: z.number(),
  order_number: z.string(),
  created_at: z.string(),
  processed_at: z.string().optional(),
  customer: z.object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string().email(),
  }),
  shipping_address: z.object({
    address1: z.string(),
    city: z.string(),
    province: z.string().optional(),
    zip: z.string(),
    country: z.string(),
    phone: z.string().optional(),
  }).optional(),
  line_items: z.array(z.object({
    id: z.number(),
    title: z.string(),
    price: z.string(),
    quantity: z.number(),
    product_id: z.number(),
    variant_id: z.number(),
    sku: z.string().optional(),
    properties: z.array(z.object({
      name: z.string(),
      value: z.string(),
    })).optional(),
  })),
  total_price: z.string(),
});

export type OrderWebhookData = z.infer<typeof orderWebhookSchema>;

// Dashboard statistics schemas
export const statusDistributionItemSchema = z.object({
  status: z.string(),
  count: z.number(),
});

export const monthlySalesItemSchema = z.object({
  month: z.string(),
  sales: z.number(),
});

export const dashboardStatsSchema = z.object({
  totalItems: z.number(),
  totalOrders: z.number(),
  totalSales: z.number(),
  totalPayout: z.number(),
  statusDistribution: z.array(statusDistributionItemSchema),
  monthlySales: z.array(monthlySalesItemSchema),
});

export type StatusDistributionItem = z.infer<typeof statusDistributionItemSchema>;
export type MonthlySalesItem = z.infer<typeof monthlySalesItemSchema>;
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Commission settings
export const commissionTierSchema = z.object({
  minValue: z.number(),
  maxValue: z.number().optional(),
  rate: z.number(),
  description: z.string().optional(),
});

export const commissionSettingsSchema = z.object({
  tiers: z.array(commissionTierSchema),
  minimumItemValue: z.number(),
});

export type CommissionTiers = z.infer<typeof commissionTierSchema>;
export type CommissionSettings = z.infer<typeof commissionSettingsSchema>;

// Payout options for consignors
export const payoutOptionsSchema = z.object({
  bank: z.boolean(),
  cash: z.boolean(),
  storeCredit: z.boolean(),
  storeCreditBonus: z.number(), // Percentage bonus for store credit
});

export type PayoutOptions = z.infer<typeof payoutOptionsSchema>;

// Consignor dashboard data
export const consignorDashboardSchema = z.object({
  totalItems: z.number(),
  pendingItems: z.number(),
  listedItems: z.number(),
  soldItems: z.number(),
  totalSales: z.number(),
  totalPayout: z.number(),
  pendingPayout: z.number(),
  statusDistribution: z.array(statusDistributionItemSchema),
  monthlySales: z.array(monthlySalesItemSchema),
});

export type ConsignorDashboard = z.infer<typeof consignorDashboardSchema>;

// ML Training Example table
export const mlTrainingExamples = pgTable("ml_training_examples", {
  id: serial("id").primaryKey(),
  productType: text("product_type").notNull(),
  imageUrl: text("image_url").notNull(),
  brand: text("brand"),
  model: text("model"),
  description: text("description"),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMlTrainingExampleSchema = createInsertSchema(mlTrainingExamples).omit({
  id: true,
  verified: true,
  createdAt: true,
});

// ML Model Config table
export const mlModelConfigs = pgTable("ml_model_configs", {
  id: serial("id").primaryKey(),
  modelId: text("model_id").notNull().unique(),
  modelName: text("model_name").notNull(),
  description: text("description"),
  parameters: jsonb("parameters").notNull(),
  isActive: boolean("is_active").default(false),
  lastTrainingDate: timestamp("last_training_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMlModelConfigSchema = createInsertSchema(mlModelConfigs).omit({
  id: true,
  isActive: true,
  lastTrainingDate: true,
  createdAt: true,
});

// ML Training Session table
export const mlTrainingSessions = pgTable("ml_training_sessions", {
  id: serial("id").primaryKey(),
  modelConfigId: integer("model_config_id").notNull().references(() => mlModelConfigs.id),
  status: text("status").notNull().default("pending"),
  metrics: jsonb("metrics"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  logs: text("logs"),
});

export const insertMlTrainingSessionSchema = createInsertSchema(mlTrainingSessions).omit({
  id: true,
  status: true,
  startedAt: true,
  completedAt: true,
});

export type MlTrainingExample = typeof mlTrainingExamples.$inferSelect;
export type InsertMlTrainingExample = z.infer<typeof insertMlTrainingExampleSchema>;

export type MlModelConfig = typeof mlModelConfigs.$inferSelect;
export type InsertMlModelConfig = z.infer<typeof insertMlModelConfigSchema>;

export type MlTrainingSession = typeof mlTrainingSessions.$inferSelect;
export type InsertMlTrainingSession = z.infer<typeof insertMlTrainingSessionSchema>;

// Admin users table (separate from consignors/customers)
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // Hashed password
  name: text("name").notNull(),
  role: text("role").notNull().default(UserRole.ADMIN),
  provider: text("provider").notNull().default(AuthProvider.LOCAL), // Simplified provider handling
  last_login: timestamp("last_login"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  external_id: text("external_id"), // ID from external provider
  profile_image_url: text("profile_image_url") // Avatar URL
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  created_at: true,
  last_login: true,
});

// Relations
export const customersRelations = relations(customers, ({ many }) => ({
  items: many(items),
  orders: many(orders),
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
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  orderItems: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  item: one(items, {
    fields: [orderItems.itemId],
    references: [items.id],
  }),
}));

// Session store for authentication
export const sessions = pgTable("sessions", {
  sid: varchar("sid", { length: 255 }).primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { withTimezone: true }).notNull(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;