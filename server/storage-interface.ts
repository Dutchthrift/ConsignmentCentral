import { 
  Customer, InsertCustomer, 
  Item, InsertItem, 
  Analysis, InsertAnalysis, 
  Pricing, InsertPricing, 
  Shipping, InsertShipping,
  ItemWithDetails,
  DashboardStats,
  MlTrainingExample, InsertMlTrainingExample,
  MlModelConfig, InsertMlModelConfig,
  MlTrainingSession, InsertMlTrainingSession,
  User, InsertUser,
  AdminUser, InsertAdminUser,
  UserType,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  OrderWithDetails, OrderSummary
} from "@shared/schema";

import session from 'express-session';

// Storage interface
export interface IStorage {
  // Session store for authentication
  sessionStore: session.Store;

  // Customer methods
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomerByEmail(email: string, updates: Partial<Customer>): Promise<Customer | undefined>;
  getAllCustomers(): Promise<Customer[]>;
  
  // Item methods
  getItem(id: number): Promise<Item | undefined>;
  getItemByReferenceId(referenceId: string): Promise<Item | undefined>;
  getItemsByCustomerId(customerId: number): Promise<Item[]>;
  createItem(item: InsertItem): Promise<Item>;
  updateItemStatus(id: number, status: string): Promise<Item | undefined>;
  
  // Analysis methods
  getAnalysisByItemId(itemId: number): Promise<Analysis | undefined>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  
  // Pricing methods
  getPricingByItemId(itemId: number): Promise<Pricing | undefined>;
  createPricing(pricing: InsertPricing): Promise<Pricing>;
  updatePricing(id: number, updates: Partial<Pricing>): Promise<Pricing | undefined>;
  
  // Shipping methods
  getShippingByItemId(itemId: number): Promise<Shipping | undefined>;
  createShipping(shipping: InsertShipping): Promise<Shipping>;
  
  // Order methods
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getOrdersByCustomerId(customerId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, updates: Partial<Order>): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  addItemToOrder(orderId: number, itemId: number): Promise<OrderItem>;
  removeItemFromOrder(orderId: number, itemId: number): Promise<boolean>;
  getOrderWithDetails(orderId: number): Promise<OrderWithDetails | undefined>;
  getOrderWithDetailsByNumber(orderNumber: string): Promise<OrderWithDetails | undefined>;
  getAllOrdersWithDetails(): Promise<OrderWithDetails[]>;
  getOrdersWithDetailsByCustomerId(customerId: number): Promise<OrderWithDetails[]>;
  getOrderSummaries(): Promise<OrderSummary[]>;
  searchOrders(query: string): Promise<OrderSummary[]>;
  updateOrderTrackingCode(orderId: number, trackingCode: string): Promise<Order | undefined>;
  
  // ML Training Example methods
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
  createMlTrainingSession(session: InsertMlTrainingSession): Promise<MlTrainingSession>;
  updateMlTrainingSessionStatus(id: number, status: string, updates?: Partial<MlTrainingSession>): Promise<MlTrainingSession | undefined>;
  
  // Composite methods
  getItemWithDetails(itemId: number): Promise<ItemWithDetails | undefined>;
  getItemWithDetailsByReferenceId(referenceId: string): Promise<ItemWithDetails | undefined>;
  getAllItemsWithDetails(): Promise<ItemWithDetails[]>;
  getItemsWithDetailsByCustomerId(customerId: number): Promise<ItemWithDetails[]>;
  
  // New direct method for consignor dashboard
  getItemsForConsignorDashboard(customerId: number): Promise<any[]>;
  
  // Dashboard methods
  getDashboardStats(): Promise<DashboardStats>;
  getConsignorStats(consignorId: number): Promise<{
    totalItems: number;
    totalSales: number;
    itemsPerStatus: Record<string, number>;
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
  getAdminStats(): Promise<{
    totalUsers: number;
    totalConsignors: number;
    totalAdmins: number;
  }>;
  getConsignorDetails(userId: number): Promise<{
    user: User;
    customer?: Customer;
    stats: {
      totalItems: number;
      totalSales: number;
      itemsPerStatus: Record<string, number>;
    };
    items: ItemWithDetails[];
  } | undefined>;

  // Admin User methods
  getAdminUserById(id: number): Promise<AdminUser | undefined>;
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  getAdminUserByExternalId(externalId: string, provider: string): Promise<AdminUser | undefined>;
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;
  updateAdminUserLastLogin(id: number): Promise<AdminUser | undefined>;
  updateAdminUserExternalId(id: number, externalId: string, provider: string): Promise<AdminUser | undefined>; 
  getAllAdminUsers(): Promise<AdminUser[]>;
}