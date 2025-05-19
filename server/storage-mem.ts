import { IStorage } from './storage';
import { 
  User, InsertUser, 
  Customer, InsertCustomer, 
  Item, InsertItem, 
  Analysis, InsertAnalysis,
  Pricing, InsertPricing,
  Shipping, InsertShipping,
  Order, InsertOrder,
  OrderItem, MlTrainingExample, InsertMlTrainingExample,
  MlModelConfig, InsertMlModelConfig,
  MlTrainingSession, InsertMlTrainingSession,
  AdminUser, InsertAdminUser
} from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';
import session from 'express-session';
import createMemoryStore from 'memorystore';

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: User[] = [];
  private customers: Customer[] = [];
  private items: Item[] = [];
  private analyses: Analysis[] = [];
  private pricings: Pricing[] = [];
  private shippings: Shipping[] = [];
  private orders: Order[] = [];
  private orderItems: OrderItem[] = [];
  private mlTrainingExamples: MlTrainingExample[] = [];
  private mlModelConfigs: MlModelConfig[] = [];
  private mlTrainingSessions: MlTrainingSession[] = [];
  private adminUsers: AdminUser[] = [];
  
  sessionStore: session.SessionStore;

  constructor() {
    console.log('Using in-memory storage for development');
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Create some initial admin and customer accounts for testing
    this.createInitialAccounts();
  }

  private createInitialAccounts() {
    // Create a test admin user
    this.adminUsers.push({
      id: 1,
      email: 'admin@dutchthrift.com',
      password: '$2b$10$YgHwA5SbpGxcfCo9YVBvNOF91aQtZK4Xv4/gLWe9M3U/ZkXyV/h4S', // admin123
      name: 'Admin User',
      role: 'admin',
      createdAt: new Date(),
      provider: 'local',
      lastLogin: null
    });
    
    // Create a test customer/consignor
    this.users.push({
      id: 1,
      email: 'theooenema@hotmail.com',
      password: '$2b$10$Aq35iBR/rPhoSPIvGxdSFOY2oBYFYgWjg3QX5q6ZuZWFZOi8PdM/K', // password123
      name: 'Theo Oenema',
      role: 'consignor',
      createdAt: new Date(),
      provider: 'local',
      lastLogin: null
    });
    
    // Add a customer record linked to the user
    this.customers.push({
      id: 1,
      email: 'theooenema@hotmail.com',
      firstName: 'Theo',
      lastName: 'Oenema',
      phone: '+31612345678',
      address: 'Prinsesseweg 79',
      city: 'Groningen',
      state: 'Groningen',
      postalCode: '9713 LC',
      country: 'Netherlands',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Add some sample items for the consignor
    const sampleItems = [
      {
        id: 1,
        customerId: 1,
        referenceId: 'DT-2024-001',
        title: 'Vintage Levi\'s 501 Jeans',
        brand: 'Levi\'s',
        description: 'Classic vintage Levi\'s 501 jeans from the 90s in excellent condition',
        category: 'clothing',
        condition: 'excellent',
        status: 'received',
        imageUrls: ['https://example.com/image1.jpg'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        customerId: 1,
        referenceId: 'DT-2024-002',
        title: 'Supreme Box Logo Hoodie',
        brand: 'Supreme',
        description: 'FW18 Supreme Box Logo Hoodie in Red, size L',
        category: 'clothing',
        condition: 'like new',
        status: 'received',
        imageUrls: ['https://example.com/image2.jpg'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    for (const item of sampleItems) {
      this.items.push(item as Item);
      
      // Add analysis for each item
      this.analyses.push({
        id: item.id,
        itemId: item.id,
        authenticity: 'verified',
        materialsComposition: 'Cotton',
        condition: item.condition,
        measurements: 'Width: 20in, Length: 30in',
        notes: 'Authentic item in great condition',
        createdAt: new Date(),
        updatedAt: new Date()
      } as Analysis);
      
      // Add pricing for each item
      this.pricings.push({
        id: item.id,
        itemId: item.id,
        averageMarketPrice: item.id === 1 ? 150 : 450,
        suggestedListingPrice: item.id === 1 ? 120 : 400,
        commissionRate: item.id === 1 ? 0.40 : 0.30,
        payout: item.id === 1 ? 72 : 280,
        storeCredit: false,
        acceptedByCustomer: true,
        storeCreditAmount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Pricing);
      
      // Add shipping for each item
      this.shippings.push({
        id: item.id,
        itemId: item.id,
        weight: item.id === 1 ? 0.5 : 1.2,
        dimensions: item.id === 1 ? '30x20x5' : '35x25x10',
        shippingMethod: 'standard',
        trackingCode: item.id === 1 ? 'TRK123456789' : '',
        shippingCost: item.id === 1 ? 7.50 : 12.50,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Shipping);
    }
    
    // Create a sample order
    this.orders.push({
      id: 1,
      customerId: 1,
      orderNumber: 'DT-ORD-2024-001',
      status: 'processing',
      trackingCode: '',
      totalAmount: 120,
      createdAt: new Date(),
      updatedAt: new Date(),
      payoutStatus: 'pending',
      shippingAddress: 'Prinsesseweg 79, 9713 LC Groningen, Netherlands',
      notes: ''
    } as Order);
    
    // Add items to the order
    this.orderItems.push({
      id: 1,
      orderId: 1,
      itemId: 1,
      createdAt: new Date()
    } as OrderItem);
  }

  // User methods
  async getUserById(id: number): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.users.find(user => user.email.toLowerCase() === email.toLowerCase());
  }

  async getUserByExternalId(externalId: string, provider: string): Promise<User | undefined> {
    return this.users.find(user => 
      user.externalId === externalId && user.provider === provider
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: this.users.length + 1,
      ...user,
      createdAt: new Date()
    };
    this.users.push(newUser);
    return newUser;
  }

  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const user = await this.getUserById(id);
    if (user) {
      user.lastLogin = new Date();
      return user;
    }
    return undefined;
  }

  async updateUserExternalId(id: number, externalId: string, provider: string): Promise<User | undefined> {
    const user = await this.getUserById(id);
    if (user) {
      user.externalId = externalId;
      user.provider = provider;
      return user;
    }
    return undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return this.users;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return this.users.filter(user => user.role === role);
  }

  async getUserWithCustomer(userId: number): Promise<User & { customer?: Customer } | undefined> {
    const user = await this.getUserById(userId);
    if (!user) return undefined;
    
    const customer = await this.getCustomerByEmail(user.email);
    return {
      ...user,
      customer
    };
  }

  async linkUserToCustomer(userId: number, customerId: number): Promise<User | undefined> {
    // In a real DB, we would update the user record with the customerId
    // In memory, we just assume the user's email matches the customer's email
    return this.getUserById(userId);
  }

  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.find(customer => customer.id === id);
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    return this.customers.find(customer => 
      customer.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const newCustomer: Customer = {
      id: this.customers.length + 1,
      ...customer,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.customers.push(newCustomer);
    return newCustomer;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return this.customers;
  }

  async updateCustomerByEmail(email: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    const customer = await this.getCustomerByEmail(email);
    if (customer) {
      Object.assign(customer, updates, { updatedAt: new Date() });
      return customer;
    }
    return undefined;
  }

  async getCustomerByUserId(userId: number): Promise<Customer | undefined> {
    const user = await this.getUserById(userId);
    if (!user) return undefined;
    return this.getCustomerByEmail(user.email);
  }

  // Item methods
  async getItem(id: number): Promise<Item | undefined> {
    return this.items.find(item => item.id === id);
  }

  async getItemByReferenceId(referenceId: string): Promise<Item | undefined> {
    return this.items.find(item => item.referenceId === referenceId);
  }

  async getItemsByCustomerId(customerId: number): Promise<Item[]> {
    return this.items.filter(item => item.customerId === customerId);
  }

  async createItem(item: InsertItem): Promise<Item> {
    const newItem: Item = {
      id: this.items.length + 1,
      ...item,
      referenceId: item.referenceId || `DT-${new Date().getFullYear()}-${String(this.items.length + 1).padStart(3, '0')}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.items.push(newItem);
    return newItem;
  }

  async updateItemStatus(id: number, status: string): Promise<Item | undefined> {
    const item = await this.getItem(id);
    if (item) {
      item.status = status;
      item.updatedAt = new Date();
      return item;
    }
    return undefined;
  }

  // Analysis methods
  async getAnalysisByItemId(itemId: number): Promise<Analysis | undefined> {
    return this.analyses.find(analysis => analysis.itemId === itemId);
  }

  async createAnalysis(analysis: InsertAnalysis): Promise<Analysis> {
    const newAnalysis: Analysis = {
      id: this.analyses.length + 1,
      ...analysis,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.analyses.push(newAnalysis);
    return newAnalysis;
  }

  // Pricing methods
  async getPricingByItemId(itemId: number): Promise<Pricing | undefined> {
    return this.pricings.find(pricing => pricing.itemId === itemId);
  }

  async createPricing(pricingData: InsertPricing): Promise<Pricing> {
    const newPricing: Pricing = {
      id: this.pricings.length + 1,
      ...pricingData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.pricings.push(newPricing);
    return newPricing;
  }

  async updatePricing(id: number, updates: Partial<Pricing>): Promise<Pricing | undefined> {
    const pricing = this.pricings.find(p => p.id === id);
    if (pricing) {
      Object.assign(pricing, updates, { updatedAt: new Date() });
      return pricing;
    }
    return undefined;
  }

  // Shipping methods
  async getShippingByItemId(itemId: number): Promise<Shipping | undefined> {
    return this.shippings.find(shipping => shipping.itemId === itemId);
  }

  async createShipping(shippingData: InsertShipping): Promise<Shipping> {
    const newShipping: Shipping = {
      id: this.shippings.length + 1,
      ...shippingData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.shippings.push(newShipping);
    return newShipping;
  }

  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.find(order => order.id === id);
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    return this.orders.find(order => order.orderNumber === orderNumber);
  }

  async getOrdersByCustomerId(customerId: number): Promise<Order[]> {
    return this.orders.filter(order => order.customerId === customerId);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const newOrder: Order = {
      id: this.orders.length + 1,
      ...order,
      orderNumber: order.orderNumber || `DT-ORD-${new Date().getFullYear()}-${String(this.orders.length + 1).padStart(3, '0')}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.orders.push(newOrder);
    return newOrder;
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order | undefined> {
    const order = await this.getOrder(id);
    if (order) {
      Object.assign(order, updates, { updatedAt: new Date() });
      return order;
    }
    return undefined;
  }

  async getAllOrders(): Promise<Order[]> {
    return this.orders;
  }

  // Order Items methods
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return this.orderItems.filter(item => item.orderId === orderId);
  }

  async addItemToOrder(orderId: number, itemId: number): Promise<OrderItem> {
    const newOrderItem: OrderItem = {
      id: this.orderItems.length + 1,
      orderId,
      itemId,
      createdAt: new Date()
    };
    this.orderItems.push(newOrderItem);
    return newOrderItem;
  }

  async removeItemFromOrder(orderId: number, itemId: number): Promise<boolean> {
    const index = this.orderItems.findIndex(
      item => item.orderId === orderId && item.itemId === itemId
    );
    if (index !== -1) {
      this.orderItems.splice(index, 1);
      return true;
    }
    return false;
  }

  // Combined data methods
  async getOrderWithDetails(orderId: number): Promise<any | undefined> {
    const order = await this.getOrder(orderId);
    if (!order) return undefined;

    const orderItems = await this.getOrderItems(orderId);
    const customer = await this.getCustomer(order.customerId);
    
    const items = await Promise.all(
      orderItems.map(async (orderItem) => {
        const item = await this.getItem(orderItem.itemId);
        const analysis = await this.getAnalysisByItemId(orderItem.itemId);
        const pricing = await this.getPricingByItemId(orderItem.itemId);
        const shipping = await this.getShippingByItemId(orderItem.itemId);
        
        return {
          ...item,
          analysis,
          pricing,
          shipping
        };
      })
    );
    
    return {
      ...order,
      customer,
      items
    };
  }

  async getOrderWithDetailsByNumber(orderNumber: string): Promise<any | undefined> {
    const order = await this.getOrderByNumber(orderNumber);
    if (!order) return undefined;
    return this.getOrderWithDetails(order.id);
  }

  async getAllOrdersWithDetails(): Promise<any[]> {
    const orderIds = this.orders.map(order => order.id);
    const orderDetails = await Promise.all(
      orderIds.map(id => this.getOrderWithDetails(id))
    );
    return orderDetails.filter(Boolean);
  }

  async getOrdersWithDetailsByCustomerId(customerId: number): Promise<any[]> {
    const customerOrders = await this.getOrdersByCustomerId(customerId);
    const orderDetails = await Promise.all(
      customerOrders.map(order => this.getOrderWithDetails(order.id))
    );
    return orderDetails.filter(Boolean);
  }

  async getOrderSummaries(): Promise<any[]> {
    return this.getAllOrdersWithDetails();
  }

  async searchOrders(query: string): Promise<any[]> {
    const lowerQuery = query.toLowerCase();
    const orders = await this.getAllOrdersWithDetails();
    
    return orders.filter(order => 
      order.orderNumber.toLowerCase().includes(lowerQuery) ||
      (order.customer?.firstName && order.customer.firstName.toLowerCase().includes(lowerQuery)) ||
      (order.customer?.lastName && order.customer.lastName.toLowerCase().includes(lowerQuery)) ||
      (order.customer?.email && order.customer.email.toLowerCase().includes(lowerQuery)) ||
      order.items.some(item => 
        item.title.toLowerCase().includes(lowerQuery) ||
        (item.brand && item.brand.toLowerCase().includes(lowerQuery)) ||
        (item.referenceId && item.referenceId.toLowerCase().includes(lowerQuery))
      )
    );
  }

  async updateOrderTrackingCode(orderId: number, trackingCode: string): Promise<Order | undefined> {
    return this.updateOrder(orderId, { trackingCode });
  }

  // ML Training Examples methods
  async getAllMlTrainingExamples(): Promise<MlTrainingExample[]> {
    return this.mlTrainingExamples;
  }

  async getMlTrainingExampleById(id: number): Promise<MlTrainingExample | undefined> {
    return this.mlTrainingExamples.find(example => example.id === id);
  }

  async getMlTrainingExamplesByProductType(productType: string): Promise<MlTrainingExample[]> {
    return this.mlTrainingExamples.filter(
      example => example.productType === productType
    );
  }

  async createMlTrainingExample(example: InsertMlTrainingExample): Promise<MlTrainingExample> {
    const newExample: MlTrainingExample = {
      id: this.mlTrainingExamples.length + 1,
      ...example,
      createdAt: new Date()
    };
    this.mlTrainingExamples.push(newExample);
    return newExample;
  }

  async updateMlTrainingExample(id: number, updates: Partial<MlTrainingExample>): Promise<MlTrainingExample | undefined> {
    const example = await this.getMlTrainingExampleById(id);
    if (example) {
      Object.assign(example, updates);
      return example;
    }
    return undefined;
  }

  async deleteMlTrainingExample(id: number): Promise<boolean> {
    const index = this.mlTrainingExamples.findIndex(example => example.id === id);
    if (index !== -1) {
      this.mlTrainingExamples.splice(index, 1);
      return true;
    }
    return false;
  }

  async getVerifiedMlTrainingExamples(): Promise<MlTrainingExample[]> {
    return this.mlTrainingExamples.filter(example => example.verified);
  }

  // ML Model Config methods
  async getAllMlModelConfigs(): Promise<MlModelConfig[]> {
    return this.mlModelConfigs;
  }

  async getMlModelConfigById(id: number): Promise<MlModelConfig | undefined> {
    return this.mlModelConfigs.find(config => config.id === id);
  }

  async getMlModelConfigByModelId(modelId: string): Promise<MlModelConfig | undefined> {
    return this.mlModelConfigs.find(config => config.modelId === modelId);
  }

  async createMlModelConfig(config: InsertMlModelConfig): Promise<MlModelConfig> {
    const newConfig: MlModelConfig = {
      id: this.mlModelConfigs.length + 1,
      ...config,
      createdAt: new Date()
    };
    this.mlModelConfigs.push(newConfig);
    return newConfig;
  }

  async updateMlModelConfig(id: number, updates: Partial<MlModelConfig>): Promise<MlModelConfig | undefined> {
    const config = await this.getMlModelConfigById(id);
    if (config) {
      Object.assign(config, updates);
      return config;
    }
    return undefined;
  }

  async getActiveMlModelConfig(): Promise<MlModelConfig | undefined> {
    return this.mlModelConfigs.find(config => config.active);
  }

  async setMlModelConfigActive(id: number, active: boolean): Promise<MlModelConfig | undefined> {
    // First, set all configs to inactive
    if (active) {
      for (const config of this.mlModelConfigs) {
        config.active = false;
      }
    }
    
    // Then set the specified one to active
    const config = await this.getMlModelConfigById(id);
    if (config) {
      config.active = active;
      return config;
    }
    return undefined;
  }

  // ML Training Session methods
  async getAllMlTrainingSessions(): Promise<MlTrainingSession[]> {
    return this.mlTrainingSessions;
  }

  async getMlTrainingSessionById(id: number): Promise<MlTrainingSession | undefined> {
    return this.mlTrainingSessions.find(session => session.id === id);
  }

  async getMlTrainingSessionsByModelConfigId(modelConfigId: number): Promise<MlTrainingSession[]> {
    return this.mlTrainingSessions.filter(
      session => session.modelConfigId === modelConfigId
    );
  }

  async createMlTrainingSession(session: InsertMlTrainingSession): Promise<MlTrainingSession> {
    const newSession: MlTrainingSession = {
      id: this.mlTrainingSessions.length + 1,
      ...session,
      createdAt: new Date()
    };
    this.mlTrainingSessions.push(newSession);
    return newSession;
  }

  async updateMlTrainingSessionStatus(id: number, status: string, results?: any): Promise<MlTrainingSession | undefined> {
    const session = await this.getMlTrainingSessionById(id);
    if (session) {
      session.status = status;
      if (results) {
        session.results = JSON.stringify(results);
      }
      return session;
    }
    return undefined;
  }

  // Item details
  async getItemWithDetails(itemId: number): Promise<any | undefined> {
    const item = await this.getItem(itemId);
    if (!item) return undefined;
    
    const analysis = await this.getAnalysisByItemId(itemId);
    const pricing = await this.getPricingByItemId(itemId);
    const shipping = await this.getShippingByItemId(itemId);
    const customer = await this.getCustomer(item.customerId);
    
    return {
      ...item,
      analysis,
      pricing,
      shipping,
      customer
    };
  }

  async getItemWithDetailsByReferenceId(referenceId: string): Promise<any | undefined> {
    const item = await this.getItemByReferenceId(referenceId);
    if (!item) return undefined;
    return this.getItemWithDetails(item.id);
  }

  async getAllItemsWithDetails(): Promise<any[]> {
    const itemIds = this.items.map(item => item.id);
    const itemDetails = await Promise.all(
      itemIds.map(id => this.getItemWithDetails(id))
    );
    return itemDetails.filter(Boolean);
  }

  async getItemsWithDetailsByCustomerId(customerId: number): Promise<any[]> {
    const customerItems = await this.getItemsByCustomerId(customerId);
    const itemDetails = await Promise.all(
      customerItems.map(item => this.getItemWithDetails(item.id))
    );
    return itemDetails.filter(Boolean);
  }

  async getItemsForConsignorDashboard(customerId: number): Promise<any[]> {
    return this.getItemsWithDetailsByCustomerId(customerId);
  }

  // Dashboard stats
  async getDashboardStats(): Promise<any> {
    const allItems = await this.getAllItemsWithDetails();
    const allOrders = await this.getAllOrdersWithDetails();
    
    // Calculate totals
    const totalItems = allItems.length;
    const totalOrders = allOrders.length;
    const totalSales = allOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalPayout = allOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => {
        return itemSum + (item.pricing?.payout || 0);
      }, 0);
    }, 0);
    
    // Status distribution
    const statusCounts = {};
    allItems.forEach(item => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    });
    
    const statusDistribution = Object.entries(statusCounts).map(
      ([status, count]) => ({ status, count })
    );
    
    // Monthly sales
    const salesByMonth = {};
    allOrders.forEach(order => {
      const date = new Date(order.createdAt);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      salesByMonth[month] = (salesByMonth[month] || 0) + (order.totalAmount || 0);
    });
    
    const monthlySales = Object.entries(salesByMonth).map(
      ([month, sales]) => ({ month, sales })
    );
    
    return {
      totalItems,
      totalOrders,
      totalSales,
      totalPayout,
      statusDistribution,
      monthlySales
    };
  }

  // Consignor stats
  async getConsignorStats(consignorId: number): Promise<any> {
    const consignorItems = await this.getItemsWithDetailsByCustomerId(consignorId);
    const consignorOrders = await this.getOrdersWithDetailsByCustomerId(consignorId);
    
    // Calculate totals
    const totalItems = consignorItems.length;
    const totalSales = consignorOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalPayout = consignorOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => {
        return itemSum + (item.pricing?.payout || 0);
      }, 0);
    }, 0);
    
    // Status distribution
    const statusCounts = {};
    consignorItems.forEach(item => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    });
    
    const statusDistribution = Object.entries(statusCounts).map(
      ([status, count]) => ({ status, count })
    );
    
    // Recent items
    const recentItems = [...consignorItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    // Recent sales 
    const recentSales = [...consignorOrders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    return {
      totalItems,
      totalSales,
      totalPayout,
      statusDistribution,
      recentItems,
      recentSales
    };
  }

  // Admin user methods
  async getAdminUserById(id: number): Promise<AdminUser | undefined> {
    return this.adminUsers.find(user => user.id === id);
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    return this.adminUsers.find(user => 
      user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async getAdminUserByExternalId(externalId: string, provider: string): Promise<AdminUser | undefined> {
    return this.adminUsers.find(user => 
      user.externalId === externalId && user.provider === provider
    );
  }

  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    const newUser: AdminUser = {
      id: this.adminUsers.length + 1,
      ...user,
      createdAt: new Date()
    };
    this.adminUsers.push(newUser);
    return newUser;
  }

  async updateAdminUserLastLogin(id: number): Promise<AdminUser | undefined> {
    const user = await this.getAdminUserById(id);
    if (user) {
      user.lastLogin = new Date();
      return user;
    }
    return undefined;
  }

  async updateAdminUserExternalId(id: number, externalId: string, provider: string): Promise<AdminUser | undefined> {
    const user = await this.getAdminUserById(id);
    if (user) {
      user.externalId = externalId;
      user.provider = provider;
      return user;
    }
    return undefined;
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    return this.adminUsers;
  }

  // Admin stats
  async getAdminStats(): Promise<any> {
    return this.getDashboardStats();
  }

  // Consignor details
  async getConsignorDetails(userId: number): Promise<any> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    
    const customer = await this.getCustomerByEmail(user.email);
    const stats = customer ? await this.getConsignorStats(customer.id) : null;
    
    return {
      user,
      customer,
      stats
    };
  }
}