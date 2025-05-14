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
  User, InsertUser
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // Customer methods
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
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
}

// Memory Storage implementation
export class MemStorage implements IStorage {
  private customers: Map<number, Customer>;
  private items: Map<number, Item>;
  private analyses: Map<number, Analysis>;
  private pricing: Map<number, Pricing>;
  private shipping: Map<number, Shipping>;
  private mlTrainingExamples: Map<number, MlTrainingExample>;
  private mlModelConfigs: Map<number, MlModelConfig>;
  private mlTrainingSessions: Map<number, MlTrainingSession>;
  private users: Map<number, User>;
  
  private customerIdCounter: number;
  private itemIdCounter: number;
  private analysisIdCounter: number;
  private pricingIdCounter: number;
  private shippingIdCounter: number;
  private mlTrainingExampleIdCounter: number;
  private mlModelConfigIdCounter: number;
  private mlTrainingSessionIdCounter: number;
  private userIdCounter: number;
  
  constructor() {
    this.customers = new Map();
    this.items = new Map();
    this.analyses = new Map();
    this.pricing = new Map();
    this.shipping = new Map();
    this.mlTrainingExamples = new Map();
    this.mlModelConfigs = new Map();
    this.mlTrainingSessions = new Map();
    this.users = new Map();
    
    this.customerIdCounter = 1;
    this.itemIdCounter = 1;
    this.analysisIdCounter = 1;
    this.pricingIdCounter = 1;
    this.shippingIdCounter = 1;
    this.mlTrainingExampleIdCounter = 1;
    this.mlModelConfigIdCounter = 1;
    this.mlTrainingSessionIdCounter = 1;
    this.userIdCounter = 1;
  }
  
  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }
  
  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(
      (customer) => customer.email === email
    );
  }
  
  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }
  
  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = this.customerIdCounter++;
    const newCustomer: Customer = { ...customer, id };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }
  
  // Item methods
  async getItem(id: number): Promise<Item | undefined> {
    return this.items.get(id);
  }
  
  async getItemByReferenceId(referenceId: string): Promise<Item | undefined> {
    return Array.from(this.items.values()).find(
      (item) => item.referenceId === referenceId
    );
  }
  
  async getItemsByCustomerId(customerId: number): Promise<Item[]> {
    return Array.from(this.items.values()).filter(
      (item) => item.customerId === customerId
    );
  }
  
  async createItem(item: InsertItem): Promise<Item> {
    const id = this.itemIdCounter++;
    const newItem: Item = { 
      ...item, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.items.set(id, newItem);
    return newItem;
  }
  
  async updateItemStatus(id: number, status: string): Promise<Item | undefined> {
    const item = this.items.get(id);
    if (!item) return undefined;
    
    const updatedItem: Item = {
      ...item,
      status,
      updatedAt: new Date()
    };
    
    this.items.set(id, updatedItem);
    return updatedItem;
  }
  
  // Analysis methods
  async getAnalysisByItemId(itemId: number): Promise<Analysis | undefined> {
    return Array.from(this.analyses.values()).find(
      (analysis) => analysis.itemId === itemId
    );
  }
  
  async createAnalysis(analysis: InsertAnalysis): Promise<Analysis> {
    const id = this.analysisIdCounter++;
    const newAnalysis: Analysis = {
      ...analysis,
      id,
      createdAt: new Date()
    };
    this.analyses.set(id, newAnalysis);
    return newAnalysis;
  }
  
  // Pricing methods
  async getPricingByItemId(itemId: number): Promise<Pricing | undefined> {
    return Array.from(this.pricing.values()).find(
      (price) => price.itemId === itemId
    );
  }
  
  async createPricing(pricing: InsertPricing): Promise<Pricing> {
    const id = this.pricingIdCounter++;
    const newPricing: Pricing = {
      ...pricing,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.pricing.set(id, newPricing);
    return newPricing;
  }
  
  async updatePricing(id: number, updates: Partial<Pricing>): Promise<Pricing | undefined> {
    const pricing = this.pricing.get(id);
    if (!pricing) return undefined;
    
    const updatedPricing: Pricing = {
      ...pricing,
      ...updates,
      updatedAt: new Date()
    };
    
    this.pricing.set(id, updatedPricing);
    return updatedPricing;
  }
  
  // Shipping methods
  async getShippingByItemId(itemId: number): Promise<Shipping | undefined> {
    return Array.from(this.shipping.values()).find(
      (shipment) => shipment.itemId === itemId
    );
  }
  
  async createShipping(shipping: InsertShipping): Promise<Shipping> {
    const id = this.shippingIdCounter++;
    const newShipping: Shipping = {
      ...shipping,
      id,
      createdAt: new Date()
    };
    this.shipping.set(id, newShipping);
    return newShipping;
  }
  
  // ML Training Example methods
  async getAllMlTrainingExamples(): Promise<MlTrainingExample[]> {
    return Array.from(this.mlTrainingExamples.values());
  }
  
  async getMlTrainingExampleById(id: number): Promise<MlTrainingExample | undefined> {
    return this.mlTrainingExamples.get(id);
  }
  
  async getMlTrainingExamplesByProductType(productType: string): Promise<MlTrainingExample[]> {
    return Array.from(this.mlTrainingExamples.values()).filter(
      example => example.productType === productType
    );
  }
  
  async createMlTrainingExample(example: InsertMlTrainingExample): Promise<MlTrainingExample> {
    const id = this.mlTrainingExampleIdCounter++;
    const newExample: MlTrainingExample = {
      id,
      itemId: example.itemId || null,
      imageUrl: example.imageUrl || null,
      imageData: example.imageData || null,
      productType: example.productType,
      brand: example.brand || null,
      model: example.model || null,
      condition: example.condition || null,
      marketValue: example.marketValue || null,
      isVerified: example.isVerified || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.mlTrainingExamples.set(id, newExample);
    return newExample;
  }
  
  async updateMlTrainingExample(id: number, updates: Partial<MlTrainingExample>): Promise<MlTrainingExample | undefined> {
    const example = this.mlTrainingExamples.get(id);
    if (!example) return undefined;
    
    const updatedExample: MlTrainingExample = {
      ...example,
      ...updates,
      updatedAt: new Date()
    };
    this.mlTrainingExamples.set(id, updatedExample);
    return updatedExample;
  }
  
  async deleteMlTrainingExample(id: number): Promise<boolean> {
    return this.mlTrainingExamples.delete(id);
  }
  
  async getVerifiedMlTrainingExamples(): Promise<MlTrainingExample[]> {
    return Array.from(this.mlTrainingExamples.values()).filter(
      example => example.isVerified
    );
  }
  
  // ML Model Config methods
  async getAllMlModelConfigs(): Promise<MlModelConfig[]> {
    return Array.from(this.mlModelConfigs.values());
  }
  
  async getMlModelConfigById(id: number): Promise<MlModelConfig | undefined> {
    return this.mlModelConfigs.get(id);
  }
  
  async getMlModelConfigByModelId(modelId: string): Promise<MlModelConfig | undefined> {
    return Array.from(this.mlModelConfigs.values()).find(
      config => config.modelId === modelId
    );
  }
  
  async createMlModelConfig(config: InsertMlModelConfig): Promise<MlModelConfig> {
    const id = this.mlModelConfigIdCounter++;
    const newConfig: MlModelConfig = {
      id,
      name: config.name,
      description: config.description || null,
      modelId: config.modelId || null,
      baseModel: config.baseModel,
      trainingParams: config.trainingParams || null,
      specialization: config.specialization,
      accuracy: config.accuracy || null,
      isActive: config.isActive || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.mlModelConfigs.set(id, newConfig);
    return newConfig;
  }
  
  async updateMlModelConfig(id: number, updates: Partial<MlModelConfig>): Promise<MlModelConfig | undefined> {
    const config = this.mlModelConfigs.get(id);
    if (!config) return undefined;
    
    const updatedConfig: MlModelConfig = {
      ...config,
      ...updates,
      updatedAt: new Date()
    };
    this.mlModelConfigs.set(id, updatedConfig);
    return updatedConfig;
  }
  
  async getActiveMlModelConfig(): Promise<MlModelConfig | undefined> {
    return Array.from(this.mlModelConfigs.values()).find(
      config => config.isActive
    );
  }
  
  async setMlModelConfigActive(id: number, active: boolean): Promise<MlModelConfig | undefined> {
    // First, set all configs to inactive if setting this one to active
    if (active) {
      for (const config of this.mlModelConfigs.values()) {
        if (config.isActive) {
          const updatedConfig = { ...config, isActive: false, updatedAt: new Date() };
          this.mlModelConfigs.set(config.id, updatedConfig);
        }
      }
    }
    
    // Now update the target config
    const config = this.mlModelConfigs.get(id);
    if (!config) return undefined;
    
    const updatedConfig: MlModelConfig = {
      ...config,
      isActive: active,
      updatedAt: new Date()
    };
    this.mlModelConfigs.set(id, updatedConfig);
    return updatedConfig;
  }
  
  // ML Training Session methods
  async getAllMlTrainingSessions(): Promise<MlTrainingSession[]> {
    return Array.from(this.mlTrainingSessions.values());
  }
  
  async getMlTrainingSessionById(id: number): Promise<MlTrainingSession | undefined> {
    return this.mlTrainingSessions.get(id);
  }
  
  async getMlTrainingSessionsByModelConfigId(modelConfigId: number): Promise<MlTrainingSession[]> {
    return Array.from(this.mlTrainingSessions.values()).filter(
      session => session.modelConfigId === modelConfigId
    );
  }
  
  async createMlTrainingSession(session: InsertMlTrainingSession): Promise<MlTrainingSession> {
    const id = this.mlTrainingSessionIdCounter++;
    const newSession: MlTrainingSession = {
      id,
      modelConfigId: session.modelConfigId,
      startedAt: new Date(),
      completedAt: null,
      status: session.status || "pending",
      trainingExampleCount: session.trainingExampleCount || 0,
      validationExampleCount: session.validationExampleCount || 0,
      trainingLoss: session.trainingLoss || null,
      validationLoss: session.validationLoss || null,
      notes: session.notes || null,
      resultData: session.resultData || null
    };
    this.mlTrainingSessions.set(id, newSession);
    return newSession;
  }
  
  async updateMlTrainingSessionStatus(id: number, status: string, updates?: Partial<MlTrainingSession>): Promise<MlTrainingSession | undefined> {
    const session = this.mlTrainingSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession: MlTrainingSession = {
      ...session,
      ...updates,
      status,
      completedAt: (status === "completed" || status === "failed") ? new Date() : session.completedAt
    };
    this.mlTrainingSessions.set(id, updatedSession);
    return updatedSession;
  }

  // User methods
  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async getUserByExternalId(externalId: string, provider: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.externalId === externalId && user.provider === provider
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = {
      ...user,
      id,
      createdAt: new Date(),
      lastLogin: new Date()
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      lastLogin: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.role === role
    );
  }

  async getUserWithCustomer(userId: number): Promise<User & { customer?: Customer } | undefined> {
    const user = await this.getUserById(userId);
    if (!user) return undefined;

    if (user.customerId) {
      const customer = await this.getCustomer(user.customerId);
      if (customer) {
        return { ...user, customer };
      }
    }

    return user;
  }

  async linkUserToCustomer(userId: number, customerId: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      customerId
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    totalConsignors: number;
    totalAdmins: number;
  }> {
    const allUsers = Array.from(this.users.values());
    
    return {
      totalUsers: allUsers.length,
      totalConsignors: allUsers.filter(user => user.role === 'consignor').length,
      totalAdmins: allUsers.filter(user => user.role === 'admin').length
    };
  }

  async getConsignorDetails(userId: number): Promise<{
    user: User;
    customer?: Customer;
    stats: {
      totalItems: number;
      totalSales: number;
      itemsPerStatus: Record<string, number>;
    };
    items: ItemWithDetails[];
  } | undefined> {
    const user = await this.getUserById(userId);
    if (!user) return undefined;

    let customer: Customer | undefined;
    let stats = {
      totalItems: 0,
      totalSales: 0,
      itemsPerStatus: {}
    };
    let itemsList: ItemWithDetails[] = [];

    if (user.customerId) {
      customer = await this.getCustomer(user.customerId);
      if (customer) {
        stats = await this.getConsignorStats(customer.id);
        itemsList = await this.getItemsWithDetailsByCustomerId(customer.id);
      }
    }

    return {
      user,
      customer,
      stats,
      items: itemsList
    };
  }
  
  // Composite methods
  async getItemWithDetails(itemId: number): Promise<ItemWithDetails | undefined> {
    const item = await this.getItem(itemId);
    if (!item) return undefined;
    
    const customer = await this.getCustomer(item.customerId);
    if (!customer) return undefined;
    
    const analysis = await this.getAnalysisByItemId(itemId);
    const pricing = await this.getPricingByItemId(itemId);
    const shipping = await this.getShippingByItemId(itemId);
    
    return {
      ...item,
      customer,
      analysis,
      pricing,
      shipping
    };
  }
  
  async getItemWithDetailsByReferenceId(referenceId: string): Promise<ItemWithDetails | undefined> {
    const item = await this.getItemByReferenceId(referenceId);
    if (!item) return undefined;
    
    return this.getItemWithDetails(item.id);
  }
  
  async getAllItemsWithDetails(): Promise<ItemWithDetails[]> {
    const results: ItemWithDetails[] = [];
    
    for (const item of this.items.values()) {
      const itemWithDetails = await this.getItemWithDetails(item.id);
      if (itemWithDetails) {
        results.push(itemWithDetails);
      }
    }
    
    return results;
  }
  
  async getItemsWithDetailsByCustomerId(customerId: number): Promise<ItemWithDetails[]> {
    const items = await this.getItemsByCustomerId(customerId);
    const results: ItemWithDetails[] = [];
    
    for (const item of items) {
      const itemWithDetails = await this.getItemWithDetails(item.id);
      if (itemWithDetails) {
        results.push(itemWithDetails);
      }
    }
    
    return results;
  }
  
  // Dashboard methods
  async getDashboardStats(): Promise<DashboardStats> {
    const allItems = Array.from(this.items.values());
    
    // Count items by status
    const pendingAnalysis = allItems.filter(
      (item) => item.status === "pending"
    ).length;
    
    const activeListings = allItems.filter(
      (item) => item.status === "listed"
    ).length;
    
    const soldItems = allItems.filter(
      (item) => item.status === "sold" || item.status === "paid"
    ).length;
    
    // Calculate total revenue
    let totalRevenue = 0;
    for (const item of allItems) {
      if (item.status === "sold" || item.status === "paid") {
        const pricing = await this.getPricingByItemId(item.id);
        if (pricing && pricing.finalSalePrice) {
          totalRevenue += pricing.finalSalePrice / 100; // Convert cents to EUR
        }
      }
    }
    
    // Get status distribution
    const statusCounts: Record<string, number> = {};
    for (const item of allItems) {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    }
    
    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));
    
    // Create monthly sales data (this would normally come from real data)
    const now = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlySalesData = [];
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlySalesData.push({
        month: `${monthNames[month.getMonth()]} ${month.getFullYear()}`,
        sales: 0, // We'll calculate this in a real implementation
      });
    }
    
    return {
      totalIntakes: allItems.length,
      pendingAnalysis,
      activeListings,
      soldItems,
      totalRevenue,
      statusDistribution,
      monthlySalesData,
    };
  }
  
  async getConsignorStats(consignorId: number): Promise<{
    totalItems: number;
    totalSales: number;
    itemsPerStatus: Record<string, number>;
  }> {
    const items = await this.getItemsByCustomerId(consignorId);
    
    // Count items by status
    const itemsPerStatus: Record<string, number> = {};
    for (const item of items) {
      itemsPerStatus[item.status] = (itemsPerStatus[item.status] || 0) + 1;
    }
    
    // Calculate total sales
    let totalSales = 0;
    for (const item of items) {
      if (item.status === "sold" || item.status === "paid") {
        const pricing = await this.getPricingByItemId(item.id);
        if (pricing && pricing.finalSalePrice) {
          totalSales += pricing.finalSalePrice / 100; // Convert cents to EUR
        }
      }
    }
    
    return {
      totalItems: items.length,
      totalSales,
      itemsPerStatus,
    };
  }
}

// Export the storage instance
import { DatabaseStorage } from './database-storage';

// Use DatabaseStorage instead of MemStorage for persistence
export const storage = new DatabaseStorage();
