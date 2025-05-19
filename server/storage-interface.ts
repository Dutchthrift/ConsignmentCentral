/**
 * Storage interface for the application
 * Provides a consistent interface for different storage implementations
 */
import { 
  Customer, InsertCustomer,
  Item, InsertItem, 
  Analysis, InsertAnalysis,
  Pricing, InsertPricing,
  Shipping, InsertShipping,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  User, InsertUser,
  AdminUser, InsertAdminUser,
  MlTrainingExample, InsertMlTrainingExample,
  MlModelConfig, InsertMlModelConfig,
  MlTrainingSession, InsertMlTrainingSession,
  OrderWithDetails, OrderSummary,
  ItemWithDetails, DashboardStats
} from "@shared/schema";
import session from 'express-session';

export interface IStorage {
  // Session store
  sessionStore: session.Store;

  // Customer methods
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomerByEmail(email: string, updates: Partial<Customer>): Promise<Customer | undefined>;
  getAllCustomers(): Promise<Customer[]>;
  getCustomerByUserId(userId: number): Promise<Customer | undefined>;

  // Item methods
  getItem(id: number): Promise<Item | undefined>;
  getItemByReferenceId(referenceId: string): Promise<Item | undefined>;
  getItemsByCustomerId(customerId: number): Promise<Item[]>;
  createItem(item: InsertItem): Promise<Item>;
  updateItemStatus(id: number, status: string): Promise<Item | undefined>;

  // Analysis methods
  getAnalysisByItemId(itemId: number): Promise<Analysis | undefined>;
  createAnalysis(analysisData: InsertAnalysis): Promise<Analysis>;

  // Pricing methods
  getPricingByItemId(itemId: number): Promise<Pricing | undefined>;
  createPricing(pricingData: InsertPricing): Promise<Pricing>;
  updatePricing(id: number, updates: Partial<Pricing>): Promise<Pricing | undefined>;

  // Shipping methods
  getShippingByItemId(itemId: number): Promise<Shipping | undefined>;
  createShipping(shippingData: InsertShipping): Promise<Shipping>;

  // Order methods
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getOrdersByCustomerId(customerId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, updates: Partial<Order>): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;

  // Order items methods
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  addItemToOrder(orderId: number, itemId: number): Promise<OrderItem>;
  removeItemFromOrder(orderId: number, itemId: number): Promise<boolean>;

  // Order with details methods
  getOrderWithDetails(orderId: number): Promise<OrderWithDetails | undefined>;
  getOrderWithDetailsByNumber(orderNumber: string): Promise<OrderWithDetails | undefined>;
  getAllOrdersWithDetails(): Promise<OrderWithDetails[]>;
  getOrdersWithDetailsByCustomerId(customerId: number): Promise<OrderWithDetails[]>;
  getOrderSummaries(): Promise<OrderSummary[]>;
  searchOrders(query: string): Promise<OrderSummary[]>;
  updateOrderTrackingCode(orderId: number, trackingCode: string): Promise<Order | undefined>;

  // ML Training methods
  getAllMlTrainingExamples(): Promise<MlTrainingExample[]>;
  getMlTrainingExampleById(id: number): Promise<MlTrainingExample | undefined>;
  getMlTrainingExamplesByProductType(productType: string): Promise<MlTrainingExample[]>;
  createMlTrainingExample(example: InsertMlTrainingExample): Promise<MlTrainingExample>;
  updateMlTrainingExample(id: number, updates: Partial<MlTrainingExample>): Promise<MlTrainingExample | undefined>;
  deleteMlTrainingExample(id: number): Promise<boolean>;
  getVerifiedMlTrainingExamples(): Promise<MlTrainingExample[]>;

  // ML Model Config methods
  getAllMlModelConfigs(): Promise<MlModelConfig[]>;
  getMlModelConfigById(id: number): Promise<MlModelConfig | undefined>;
  getMlModelConfigByModelId(modelId: string): Promise<MlModelConfig | undefined>;
  createMlModelConfig(config: InsertMlModelConfig): Promise<MlModelConfig>;
  updateMlModelConfig(id: number, updates: Partial<MlModelConfig>): Promise<MlModelConfig | undefined>;
  getActiveMlModelConfig(): Promise<MlModelConfig | undefined>;
  setMlModelConfigActive(id: number, active: boolean): Promise<MlModelConfig | undefined>;

  // ML Training Session methods
  getAllMlTrainingSessions(): Promise<MlTrainingSession[]>;
  getMlTrainingSessionById(id: number): Promise<MlTrainingSession | undefined>;
  getMlTrainingSessionsByModelConfigId(modelConfigId: number): Promise<MlTrainingSession[]>;
  createMlTrainingSession(sessionData: InsertMlTrainingSession): Promise<MlTrainingSession>;
  updateMlTrainingSessionStatus(id: number, status: string, metrics?: any, logs?: string): Promise<MlTrainingSession | undefined>;

  // Item with details methods
  getItemWithDetails(itemId: number): Promise<ItemWithDetails | undefined>;
  getItemWithDetailsByReferenceId(referenceId: string): Promise<ItemWithDetails | undefined>;
  getAllItemsWithDetails(): Promise<ItemWithDetails[]>;
  getItemsWithDetailsByCustomerId(customerId: number): Promise<ItemWithDetails[]>;
  getItemsForConsignorDashboard(customerId: number): Promise<any[]>;

  // Dashboard methods
  getDashboardStats(): Promise<DashboardStats>;
  getConsignorStats(consignorId: number): Promise<{
    totalItems: number;
    itemsByStatus: { status: string; count: number }[];
    totalOrders: number;
    totalPayout: number;
  }>;

  // User methods
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByExternalId(externalId: string, provider: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: number): Promise<User | undefined>;
  updateUserExternalId(id: number, externalId: string, provider: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getUserWithCustomer(userId: number): Promise<User & { customer?: Customer } | undefined>;
  linkUserToCustomer(userId: number, customerId: number): Promise<User | undefined>;

  // Admin methods
  getAdminStats(): Promise<any>;
  getConsignorDetails(userId: number): Promise<{
    user: User;
    customer?: Customer;
    stats: {
      totalItems: number;
      itemsByStatus: { status: string; count: number }[];
      totalOrders: number;
      totalPayout: number;
    };
    recentItems: ItemWithDetails[];
    recentOrders: OrderWithDetails[];
  }>;

  // Admin user methods
  getAdminUserById(id: number): Promise<AdminUser | undefined>;
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  getAdminUserByExternalId(externalId: string, provider: string): Promise<AdminUser | undefined>;
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;
  updateAdminUserLastLogin(id: number): Promise<AdminUser | undefined>;
  updateAdminUserExternalId(id: number, externalId: string, provider: string): Promise<AdminUser | undefined>;
  getAllAdminUsers(): Promise<AdminUser[]>;
}