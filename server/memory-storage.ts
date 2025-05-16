import { IStorage } from './database-storage';
import connectMemStore from 'memorystore';
import session from 'express-session';
import { 
  Customer, InsertCustomer, 
  Item, InsertItem, 
  Analysis, InsertAnalysis,
  Pricing, InsertPricing,
  Shipping, InsertShipping,
  Order, InsertOrder,
  OrderItem,
  MlTrainingExample, InsertMlTrainingExample,
  MlModelConfig, InsertMlModelConfig,
  MlTrainingSession, InsertMlTrainingSession,
  User, InsertUser,
  AdminUser, InsertAdminUser
} from '@shared/schema';

const MemoryStore = connectMemStore(session);

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
  sessionStore: session.Store;

  constructor() {
    console.log('Using in-memory storage for development');
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });

    // Create initial admin user
    const adminUser: AdminUser = {
      id: 1,
      email: 'admin@dutchthrift.com',
      password: '$2b$10$hVAw5gAzSgCbIUgxYqQlYek5iQeAZxAtXpGSFxK1mHfhrp4YdRzZu', // admin123
      name: 'Admin User',
      role: 'admin',
      provider: 'local',
      createdAt: new Date(),
      lastLogin: new Date()
    };
    this.adminUsers.push(adminUser);

    // Create test customer
    const testCustomer: Customer = {
      id: 1,
      email: 'consignor@example.com',
      name: 'Test Consignor',
      phone: '1234567890',
      address: '123 Test Street',
      city: 'Amsterdam',
      postalCode: '1000AA',
      country: 'Netherlands',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.customers.push(testCustomer);

    // Create test user linked to customer
    const testUser: User = {
      id: 1,
      email: 'consignor@example.com',
      password: '$2b$10$hVAw5gAzSgCbIUgxYqQlYek5iQeAZxAtXpGSFxK1mHfhrp4YdRzZu', // password123
      name: 'Test Consignor',
      role: 'consignor',
      provider: 'local',
      createdAt: new Date(),
      lastLogin: new Date(),
      customerId: 1
    };
    this.users.push(testUser);

    // Create sample items
    const sampleItems: Item[] = [
      {
        id: 1,
        customerId: 1,
        referenceId: 'DT-2023-001',
        name: 'Vintage Levi\'s 501 Jeans',
        description: 'Excellent condition vintage Levi\'s 501 jeans from the 1990s',
        brand: 'Levi\'s',
        category: 'Clothing',
        condition: 'Excellent',
        size: '32x34',
        color: 'Blue',
        materials: 'Denim, Cotton',
        status: 'Received',
        imageUrls: ['https://example.com/image1.jpg'],
        notes: 'Authentic vintage with red tab',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        customerId: 1,
        referenceId: 'DT-2023-002',
        name: 'Nike Air Jordan 1 Retro High',
        description: 'Used but excellent condition Nike Air Jordan 1 Retro High OG Chicago',
        brand: 'Nike',
        category: 'Footwear',
        condition: 'Good',
        size: 'EU 42',
        color: 'Red/White/Black',
        materials: 'Leather, Rubber',
        status: 'Listed',
        imageUrls: ['https://example.com/shoes1.jpg'],
        notes: 'Original box included',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    this.items.push(...sampleItems);

    // Add pricing for sample items
    const samplePricings: Pricing[] = [
      {
        id: 1,
        itemId: 1,
        suggestedPrice: 120.00,
        actualPrice: 120.00,
        commissionRate: 0.4,
        payoutAmount: 72.00,
        currencyCode: 'EUR',
        acceptedByCustomer: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        itemId: 2,
        suggestedPrice: 250.00,
        actualPrice: 250.00,
        commissionRate: 0.4,
        payoutAmount: 150.00,
        currencyCode: 'EUR',
        acceptedByCustomer: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    this.pricings.push(...samplePricings);

    // Sample order
    const sampleOrder: Order = {
      id: 1,
      orderNumber: 'ORD-2023-001',
      customerId: 1,
      orderDate: new Date(),
      status: 'Paid',
      shippingAddress: '123 Buyer Street, Amsterdam',
      billingAddress: '123 Buyer Street, Amsterdam',
      totalAmount: 120.00,
      shippingCost: 5.00,
      trackingCode: 'TR123456789NL',
      paymentMethod: 'Credit Card',
      notes: 'Please ship with care',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.orders.push(sampleOrder);

    // Link item to order
    const sampleOrderItem: OrderItem = {
      id: 1,
      orderId: 1,
      itemId: 1,
      price: 120.00,
      quantity: 1,
      createdAt: new Date()
    };
    this.orderItems.push(sampleOrderItem);
  }

  // Implementation of all IStorage methods for Customer
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.find(customer => customer.id === id);
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    return this.customers.find(customer => customer.email === email);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const newId = this.customers.length > 0 ? Math.max(...this.customers.map(c => c.id)) + 1 : 1;
    const newCustomer: Customer = {
      id: newId,
      ...customer,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.customers.push(newCustomer);
    return newCustomer;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return [...this.customers];
  }

  async updateCustomerByEmail(email: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    const index = this.customers.findIndex(c => c.email === email);
    if (index === -1) return undefined;
    
    const updatedCustomer = {
      ...this.customers[index],
      ...updates,
      updatedAt: new Date()
    };
    this.customers[index] = updatedCustomer;
    return updatedCustomer;
  }

  async getCustomerByUserId(userId: number): Promise<Customer | undefined> {
    const user = await this.getUserById(userId);
    if (!user || !user.customerId) return undefined;
    return this.getCustomer(user.customerId);
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
    const newId = this.items.length > 0 ? Math.max(...this.items.map(i => i.id)) + 1 : 1;
    const newItem: Item = {
      id: newId,
      ...item,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.items.push(newItem);
    return newItem;
  }

  async updateItemStatus(id: number, status: string): Promise<Item | undefined> {
    const index = this.items.findIndex(i => i.id === id);
    if (index === -1) return undefined;
    
    const updatedItem = {
      ...this.items[index],
      status,
      updatedAt: new Date()
    };
    this.items[index] = updatedItem;
    return updatedItem;
  }

  // Analysis methods
  async getAnalysisByItemId(itemId: number): Promise<Analysis | undefined> {
    return this.analyses.find(a => a.itemId === itemId);
  }

  async createAnalysis(analysis: InsertAnalysis): Promise<Analysis> {
    const newId = this.analyses.length > 0 ? Math.max(...this.analyses.map(a => a.id)) + 1 : 1;
    const newAnalysis: Analysis = {
      id: newId,
      ...analysis,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.analyses.push(newAnalysis);
    return newAnalysis;
  }

  // Pricing methods
  async getPricingByItemId(itemId: number): Promise<Pricing | undefined> {
    return this.pricings.find(p => p.itemId === itemId);
  }

  async createPricing(pricingData: InsertPricing): Promise<Pricing> {
    const newId = this.pricings.length > 0 ? Math.max(...this.pricings.map(p => p.id)) + 1 : 1;
    const newPricing: Pricing = {
      id: newId,
      ...pricingData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.pricings.push(newPricing);
    return newPricing;
  }

  async updatePricing(id: number, updates: Partial<Pricing>): Promise<Pricing | undefined> {
    const index = this.pricings.findIndex(p => p.id === id);
    if (index === -1) return undefined;
    
    const updatedPricing = {
      ...this.pricings[index],
      ...updates,
      updatedAt: new Date()
    };
    this.pricings[index] = updatedPricing;
    return updatedPricing;
  }

  // Shipping methods
  async getShippingByItemId(itemId: number): Promise<Shipping | undefined> {
    return this.shippings.find(s => s.itemId === itemId);
  }

  async createShipping(shippingData: InsertShipping): Promise<Shipping> {
    const newId = this.shippings.length > 0 ? Math.max(...this.shippings.map(s => s.id)) + 1 : 1;
    const newShipping: Shipping = {
      id: newId,
      ...shippingData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.shippings.push(newShipping);
    return newShipping;
  }

  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.find(o => o.id === id);
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    return this.orders.find(o => o.orderNumber === orderNumber);
  }

  async getOrdersByCustomerId(customerId: number): Promise<Order[]> {
    return this.orders.filter(o => o.customerId === customerId);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const newId = this.orders.length > 0 ? Math.max(...this.orders.map(o => o.id)) + 1 : 1;
    const newOrder: Order = {
      id: newId,
      ...order,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.orders.push(newOrder);
    return newOrder;
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order | undefined> {
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) return undefined;
    
    const updatedOrder = {
      ...this.orders[index],
      ...updates,
      updatedAt: new Date()
    };
    this.orders[index] = updatedOrder;
    return updatedOrder;
  }

  async getAllOrders(): Promise<Order[]> {
    return [...this.orders];
  }

  // Order items
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return this.orderItems.filter(oi => oi.orderId === orderId);
  }

  async addItemToOrder(orderId: number, itemId: number): Promise<OrderItem> {
    const item = await this.getItem(itemId);
    if (!item) throw new Error('Item not found');
    
    const pricing = await this.getPricingByItemId(itemId);
    if (!pricing) throw new Error('Pricing not found for item');
    
    const newId = this.orderItems.length > 0 ? Math.max(...this.orderItems.map(oi => oi.id)) + 1 : 1;
    const orderItem: OrderItem = {
      id: newId,
      orderId,
      itemId,
      price: pricing.actualPrice,
      quantity: 1,
      createdAt: new Date()
    };
    this.orderItems.push(orderItem);
    return orderItem;
  }

  async removeItemFromOrder(orderId: number, itemId: number): Promise<boolean> {
    const index = this.orderItems.findIndex(oi => oi.orderId === orderId && oi.itemId === itemId);
    if (index === -1) return false;
    
    this.orderItems.splice(index, 1);
    return true;
  }

  // OrderWithDetails
  async getOrderWithDetails(orderId: number): Promise<any | undefined> {
    const order = await this.getOrder(orderId);
    if (!order) return undefined;
    
    const orderItems = await this.getOrderItems(orderId);
    const items = await Promise.all(orderItems.map(async (oi) => {
      const item = await this.getItem(oi.itemId);
      const analysis = await this.getAnalysisByItemId(oi.itemId);
      const pricing = await this.getPricingByItemId(oi.itemId);
      const shipping = await this.getShippingByItemId(oi.itemId);
      
      return {
        ...item,
        orderItem: oi,
        analysis,
        pricing,
        shipping
      };
    }));
    
    return {
      ...order,
      items,
      totalItems: orderItems.length,
      totalValue: orderItems.reduce((sum, oi) => sum + oi.price, 0),
      totalPayout: orderItems.reduce(async (sumPromise, oi) => {
        const sum = await sumPromise;
        const pricing = await this.getPricingByItemId(oi.itemId);
        return sum + (pricing?.payoutAmount || 0);
      }, Promise.resolve(0))
    };
  }

  async getOrderWithDetailsByNumber(orderNumber: string): Promise<any | undefined> {
    const order = await this.getOrderByNumber(orderNumber);
    if (!order) return undefined;
    return this.getOrderWithDetails(order.id);
  }

  async getAllOrdersWithDetails(): Promise<any[]> {
    const orders = await this.getAllOrders();
    return Promise.all(orders.map(o => this.getOrderWithDetails(o.id)));
  }

  async getOrdersWithDetailsByCustomerId(customerId: number): Promise<any[]> {
    const orders = await this.getOrdersByCustomerId(customerId);
    return Promise.all(orders.map(o => this.getOrderWithDetails(o.id)));
  }

  // Order summaries
  async getOrderSummaries(): Promise<any[]> {
    const orders = await this.getAllOrders();
    return Promise.all(orders.map(async (order) => {
      const orderItems = await this.getOrderItems(order.id);
      const totalItems = orderItems.length;
      
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        status: order.status,
        totalAmount: order.totalAmount,
        totalItems,
        customer: await this.getCustomer(order.customerId)
      };
    }));
  }

  async searchOrders(query: string): Promise<any[]> {
    const lowercaseQuery = query.toLowerCase();
    const orders = await this.getAllOrders();
    const matchingOrders = orders.filter(o => 
      o.orderNumber.toLowerCase().includes(lowercaseQuery) ||
      o.status.toLowerCase().includes(lowercaseQuery) ||
      (o.trackingCode && o.trackingCode.toLowerCase().includes(lowercaseQuery))
    );
    
    return this.getOrderSummaries();
  }

  async updateOrderTrackingCode(orderId: number, trackingCode: string): Promise<Order | undefined> {
    return this.updateOrder(orderId, { trackingCode });
  }

  // ML methods
  async getAllMlTrainingExamples(): Promise<MlTrainingExample[]> {
    return [...this.mlTrainingExamples];
  }

  async getMlTrainingExampleById(id: number): Promise<MlTrainingExample | undefined> {
    return this.mlTrainingExamples.find(ex => ex.id === id);
  }

  async getMlTrainingExamplesByProductType(productType: string): Promise<MlTrainingExample[]> {
    return this.mlTrainingExamples.filter(ex => ex.productType === productType);
  }

  async createMlTrainingExample(example: InsertMlTrainingExample): Promise<MlTrainingExample> {
    const newId = this.mlTrainingExamples.length > 0 ? 
      Math.max(...this.mlTrainingExamples.map(ex => ex.id)) + 1 : 1;
    
    const newExample: MlTrainingExample = {
      id: newId,
      ...example,
      verified: example.verified || false,
      createdAt: new Date()
    };
    this.mlTrainingExamples.push(newExample);
    return newExample;
  }

  async updateMlTrainingExample(id: number, updates: Partial<MlTrainingExample>): Promise<MlTrainingExample | undefined> {
    const index = this.mlTrainingExamples.findIndex(ex => ex.id === id);
    if (index === -1) return undefined;
    
    const updatedExample = {
      ...this.mlTrainingExamples[index],
      ...updates
    };
    this.mlTrainingExamples[index] = updatedExample;
    return updatedExample;
  }

  async deleteMlTrainingExample(id: number): Promise<boolean> {
    const index = this.mlTrainingExamples.findIndex(ex => ex.id === id);
    if (index === -1) return false;
    
    this.mlTrainingExamples.splice(index, 1);
    return true;
  }

  async getVerifiedMlTrainingExamples(): Promise<MlTrainingExample[]> {
    return this.mlTrainingExamples.filter(ex => ex.verified);
  }

  // ML Model Configs
  async getAllMlModelConfigs(): Promise<MlModelConfig[]> {
    return [...this.mlModelConfigs];
  }

  async getMlModelConfigById(id: number): Promise<MlModelConfig | undefined> {
    return this.mlModelConfigs.find(config => config.id === id);
  }

  async getMlModelConfigByModelId(modelId: string): Promise<MlModelConfig | undefined> {
    return this.mlModelConfigs.find(config => config.modelId === modelId);
  }

  async createMlModelConfig(config: InsertMlModelConfig): Promise<MlModelConfig> {
    const newId = this.mlModelConfigs.length > 0 ? 
      Math.max(...this.mlModelConfigs.map(c => c.id)) + 1 : 1;
    
    const newConfig: MlModelConfig = {
      id: newId,
      ...config,
      active: config.active || false,
      createdAt: new Date(),
      lastTrainingDate: config.lastTrainingDate || null
    };
    this.mlModelConfigs.push(newConfig);
    return newConfig;
  }

  async updateMlModelConfig(id: number, updates: Partial<MlModelConfig>): Promise<MlModelConfig | undefined> {
    const index = this.mlModelConfigs.findIndex(c => c.id === id);
    if (index === -1) return undefined;
    
    const updatedConfig = {
      ...this.mlModelConfigs[index],
      ...updates
    };
    this.mlModelConfigs[index] = updatedConfig;
    return updatedConfig;
  }

  async getActiveMlModelConfig(): Promise<MlModelConfig | undefined> {
    return this.mlModelConfigs.find(c => c.active);
  }

  async setMlModelConfigActive(id: number, active: boolean): Promise<MlModelConfig | undefined> {
    // First, set all configs to inactive
    if (active) {
      this.mlModelConfigs.forEach(c => {
        c.active = false;
      });
    }
    
    // Then set the specified one to active
    return this.updateMlModelConfig(id, { active });
  }

  // ML Training Sessions
  async getAllMlTrainingSessions(): Promise<MlTrainingSession[]> {
    return [...this.mlTrainingSessions];
  }

  async getMlTrainingSessionById(id: number): Promise<MlTrainingSession | undefined> {
    return this.mlTrainingSessions.find(s => s.id === id);
  }

  async getMlTrainingSessionsByModelConfigId(modelConfigId: number): Promise<MlTrainingSession[]> {
    return this.mlTrainingSessions.filter(s => s.modelConfigId === modelConfigId);
  }

  async createMlTrainingSession(session: InsertMlTrainingSession): Promise<MlTrainingSession> {
    const newId = this.mlTrainingSessions.length > 0 ? 
      Math.max(...this.mlTrainingSessions.map(s => s.id)) + 1 : 1;
    
    const newSession: MlTrainingSession = {
      id: newId,
      ...session,
      createdAt: new Date()
    };
    this.mlTrainingSessions.push(newSession);
    return newSession;
  }

  async updateMlTrainingSessionStatus(id: number, status: string, metrics?: any): Promise<MlTrainingSession | undefined> {
    const index = this.mlTrainingSessions.findIndex(s => s.id === id);
    if (index === -1) return undefined;
    
    const updatedSession = {
      ...this.mlTrainingSessions[index],
      status,
      metrics: metrics || this.mlTrainingSessions[index].metrics
    };
    this.mlTrainingSessions[index] = updatedSession;
    return updatedSession;
  }

  // Item with details
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
    const items = await this.items;
    return Promise.all(items.map(item => this.getItemWithDetails(item.id)));
  }

  async getItemsWithDetailsByCustomerId(customerId: number): Promise<any[]> {
    const items = await this.getItemsByCustomerId(customerId);
    return Promise.all(items.map(item => this.getItemWithDetails(item.id)));
  }

  // Dashboard stats
  async getDashboardStats(): Promise<any> {
    const totalItems = this.items.length;
    const totalOrders = this.orders.length;
    const totalSales = this.orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalPayout = this.pricings.reduce((sum, p) => sum + p.payoutAmount, 0);
    
    // Status distribution
    const statusCounts: Record<string, number> = {};
    this.items.forEach(item => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    });
    
    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
    
    // Monthly sales
    const monthlySales: { month: string, sales: number }[] = [];
    const salesByMonth: Record<string, number> = {};
    
    this.orders.forEach(order => {
      const month = order.orderDate.toISOString().substring(0, 7); // YYYY-MM format
      salesByMonth[month] = (salesByMonth[month] || 0) + order.totalAmount;
    });
    
    Object.entries(salesByMonth).forEach(([month, sales]) => {
      monthlySales.push({ month, sales });
    });
    
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
    const items = await this.getItemsByCustomerId(consignorId);
    const itemIds = items.map(item => item.id);
    
    const consignorOrderItems = this.orderItems.filter(oi => itemIds.includes(oi.itemId));
    const consignorOrderIds = [...new Set(consignorOrderItems.map(oi => oi.orderId))];
    const consignorOrders = await Promise.all(consignorOrderIds.map(id => this.getOrder(id)));
    
    // Total items
    const totalItems = items.length;
    
    // Items by status
    const statusCounts: Record<string, number> = {};
    items.forEach(item => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    });
    
    const itemsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
    
    // Total sales and payout
    const totalSales = consignorOrderItems.reduce((sum, oi) => sum + oi.price, 0);
    const totalPayout = await consignorOrderItems.reduce(async (sumPromise, oi) => {
      const sum = await sumPromise;
      const pricing = await this.getPricingByItemId(oi.itemId);
      return sum + (pricing?.payoutAmount || 0);
    }, Promise.resolve(0));
    
    // Monthly sales
    const salesByMonth: Record<string, number> = {};
    for (const orderId of consignorOrderIds) {
      const order = await this.getOrder(orderId);
      if (!order) continue;
      
      const month = order.orderDate.toISOString().substring(0, 7); // YYYY-MM format
      const orderItems = await this.getOrderItems(orderId);
      const consignorItems = orderItems.filter(oi => itemIds.includes(oi.itemId));
      const monthSales = consignorItems.reduce((sum, oi) => sum + oi.price, 0);
      
      salesByMonth[month] = (salesByMonth[month] || 0) + monthSales;
    }
    
    const monthlySales = Object.entries(salesByMonth).map(([month, sales]) => ({
      month,
      sales
    }));
    
    return {
      totalItems,
      itemsByStatus,
      totalSales,
      totalPayout,
      monthlySales
    };
  }

  // User methods
  async getUserById(id: number): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.users.find(u => u.email === email);
  }

  async getUserByExternalId(externalId: string, provider: string): Promise<User | undefined> {
    return this.users.find(u => (u as any).externalId === externalId && u.provider === provider);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newId = this.users.length > 0 ? Math.max(...this.users.map(u => u.id)) + 1 : 1;
    const newUser: User = {
      id: newId,
      ...user,
      createdAt: new Date(),
      lastLogin: null
    };
    this.users.push(newUser);
    return newUser;
  }

  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    
    const updatedUser = {
      ...this.users[index],
      lastLogin: new Date()
    };
    this.users[index] = updatedUser;
    return updatedUser;
  }

  async updateUserExternalId(id: number, externalId: string, provider: string): Promise<User | undefined> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    
    const updatedUser = {
      ...this.users[index],
      provider,
      externalId // Add this field even though it's not in the schema
    };
    this.users[index] = updatedUser;
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return [...this.users];
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return this.users.filter(u => u.role === role);
  }

  async getUserWithCustomer(userId: number): Promise<any | undefined> {
    const user = await this.getUserById(userId);
    if (!user) return undefined;
    
    if ((user as any).customerId) {
      const customer = await this.getCustomer((user as any).customerId);
      return { ...user, customer };
    }
    
    return { ...user, customer: undefined };
  }

  async linkUserToCustomer(userId: number, customerId: number): Promise<User | undefined> {
    const index = this.users.findIndex(u => u.id === userId);
    if (index === -1) return undefined;
    
    const updatedUser = {
      ...this.users[index],
      customerId  // Add this field even though it's not in the schema
    };
    this.users[index] = updatedUser;
    return updatedUser;
  }

  // Admin stats
  async getAdminStats(): Promise<any> {
    // Admin dashboard stats that show overall platform metrics
    const dashboardStats = await this.getDashboardStats();
    
    // Additional admin-specific stats
    const totalCustomers = this.customers.length;
    const totalUsers = this.users.length;
    
    // User registrations by month
    const registrationsByMonth: Record<string, number> = {};
    this.users.forEach(user => {
      const month = user.createdAt.toISOString().substring(0, 7); // YYYY-MM format
      registrationsByMonth[month] = (registrationsByMonth[month] || 0) + 1;
    });
    
    const monthlyRegistrations = Object.entries(registrationsByMonth).map(([month, count]) => ({
      month,
      count
    }));
    
    return {
      ...dashboardStats,
      totalCustomers,
      totalUsers,
      monthlyRegistrations
    };
  }

  async getConsignorDetails(userId: number): Promise<any> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');
    
    const customer = await this.getCustomerByUserId(userId);
    if (!customer) return { user, stats: null };
    
    const stats = await this.getConsignorStats(customer.id);
    
    return {
      user,
      customer,
      stats
    };
  }

  // Admin user methods
  async getAdminUserById(id: number): Promise<AdminUser | undefined> {
    return this.adminUsers.find(u => u.id === id);
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    return this.adminUsers.find(u => u.email === email);
  }

  async getAdminUserByExternalId(externalId: string, provider: string): Promise<AdminUser | undefined> {
    return this.adminUsers.find(u => (u as any).externalId === externalId && u.provider === provider);
  }

  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    const newId = this.adminUsers.length > 0 ? Math.max(...this.adminUsers.map(u => u.id)) + 1 : 1;
    const newUser: AdminUser = {
      id: newId,
      ...user,
      createdAt: new Date(),
      lastLogin: null
    };
    this.adminUsers.push(newUser);
    return newUser;
  }

  async updateAdminUserLastLogin(id: number): Promise<AdminUser | undefined> {
    const index = this.adminUsers.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    
    const updatedUser = {
      ...this.adminUsers[index],
      lastLogin: new Date()
    };
    this.adminUsers[index] = updatedUser;
    return updatedUser;
  }

  async updateAdminUserExternalId(id: number, externalId: string, provider: string): Promise<AdminUser | undefined> {
    const index = this.adminUsers.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    
    const updatedUser = {
      ...this.adminUsers[index],
      provider,
      externalId // Add this field even though it's not in the schema
    };
    this.adminUsers[index] = updatedUser;
    return updatedUser;
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    return [...this.adminUsers];
  }

  async getItemsForConsignorDashboard(customerId: number): Promise<any[]> {
    const items = await this.getItemsByCustomerId(customerId);
    const itemsWithDetails = await Promise.all(items.map(async (item) => {
      const analysis = await this.getAnalysisByItemId(item.id);
      const pricing = await this.getPricingByItemId(item.id);
      return {
        ...item,
        analysis: analysis || null,
        pricing: pricing || null
      };
    }));
    
    return itemsWithDetails;
  }
}

export const storage = new MemStorage();