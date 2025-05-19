// In-memory storage implementation
// This provides a fallback when database connections are not working

import { IStorage } from './storage-interface';
import session from 'express-session';
import { v4 as uuidv4 } from 'uuid';

// In-memory session store
const MemoryStore = session.MemoryStore;

// In-memory data stores
const adminUsers = [];
const users = [];
const customers = [];
const items = [];
const analyses = [];
const pricings = [];
const shippings = [];
const orders = [];
const orderItems = [];
const mlTrainingExamples = [];
const mlModelConfigs = [];
const mlTrainingSessions = [];

export class MemStorage {
  sessionStore;
  
  constructor() {
    console.log('Using in-memory storage for reliable testing while database issues are resolved');
    this.sessionStore = new MemoryStore();
    
    // Create test admin user if not exists
    if (!this.getAdminUserByEmail('admin@dutchthrift.com')) {
      this.createAdminUser({
        email: 'admin@dutchthrift.com',
        password: 'be86df160d734b4d30c88b12be96a5a1eb2b5f9286081844afddc47fe0f4d39c.3e17e2bd5a2d5b0a8c69a1c758fb9d5a', // admin123
        name: 'Admin User',
        role: 'admin',
        provider: 'local',
        createdAt: new Date(),
        lastLogin: null
      });
    }
    
    // Create test consignor if not exists
    if (!this.getUserByEmail('theooenema@hotmail.com')) {
      const user = this.createUser({
        email: 'theooenema@hotmail.com',
        password: 'be86df160d734b4d30c88b12be96a5a1eb2b5f9286081844afddc47fe0f4d39c.3e17e2bd5a2d5b0a8c69a1c758fb9d5a', // password123
        name: 'Theo Oenema',
        role: 'consignor',
        provider: 'local',
        createdAt: new Date(),
        lastLogin: null,
        externalId: null,
        profileImageUrl: null
      });
      
      // Create customer for the user
      const customer = this.createCustomer({
        email: 'theooenema@hotmail.com',
        name: 'Theo Oenema',
        phone: '+31612345678',
        address: 'Prinsesseweg 79',
        city: 'Groningen',
        state: null,
        postal_code: '9712HM',
        country: 'Netherlands',
        role: 'customer',
        created_at: new Date()
      });
      
      // Link customer to user
      if (user && customer) {
        this.linkUserToCustomer(user.id, customer.id);
      }
    }
  }
  
  // Admin user methods
  getAdminUserById(id) {
    return adminUsers.find(u => u.id === id);
  }
  
  getAdminUserByEmail(email) {
    return adminUsers.find(u => u.email === email);
  }
  
  getAdminUserByExternalId(externalId, provider) {
    return adminUsers.find(u => u.externalId === externalId && u.provider === provider);
  }
  
  createAdminUser(adminUser) {
    const newUser = {
      ...adminUser,
      id: adminUsers.length + 1,
      externalId: adminUser.externalId || null,
      profileImageUrl: adminUser.profileImageUrl || null
    };
    adminUsers.push(newUser);
    return newUser;
  }
  
  updateAdminUserLastLogin(id) {
    const adminUser = this.getAdminUserById(id);
    if (adminUser) {
      adminUser.lastLogin = new Date();
      return adminUser;
    }
    return undefined;
  }
  
  updateAdminUserExternalId(id, externalId, provider) {
    const adminUser = this.getAdminUserById(id);
    if (adminUser) {
      adminUser.externalId = externalId;
      adminUser.provider = provider;
      return adminUser;
    }
    return undefined;
  }
  
  getAllAdminUsers() {
    return [...adminUsers];
  }
  
  // User methods
  getUserById(id) {
    return users.find(u => u.id === id);
  }
  
  getUserByEmail(email) {
    return users.find(u => u.email === email);
  }
  
  getUserByExternalId(externalId, provider) {
    return users.find(u => u.externalId === externalId && u.provider === provider);
  }
  
  createUser(user) {
    const newUser = {
      ...user,
      id: users.length + 1,
      externalId: user.externalId || null,
      profileImageUrl: user.profileImageUrl || null
    };
    users.push(newUser);
    return newUser;
  }
  
  updateUserLastLogin(id) {
    const user = this.getUserById(id);
    if (user) {
      user.lastLogin = new Date();
      return user;
    }
    return undefined;
  }
  
  updateUserExternalId(id, externalId, provider) {
    const user = this.getUserById(id);
    if (user) {
      user.externalId = externalId;
      user.provider = provider;
      return user;
    }
    return undefined;
  }
  
  getAllUsers() {
    return [...users];
  }
  
  getUsersByRole(role) {
    return users.filter(u => u.role === role);
  }
  
  getUserWithCustomer(userId) {
    const user = this.getUserById(userId);
    if (!user) return undefined;
    
    const customer = this.getCustomerByUserId(userId);
    return { ...user, customer };
  }
  
  linkUserToCustomer(userId, customerId) {
    const user = this.getUserById(userId);
    if (user) {
      user.customerId = customerId;
      return user;
    }
    return undefined;
  }
  
  // Customer methods
  getCustomer(id) {
    return customers.find(c => c.id === id);
  }
  
  getCustomerByEmail(email) {
    return customers.find(c => c.email === email);
  }
  
  createCustomer(customer) {
    const newCustomer = {
      ...customer,
      id: customers.length + 1,
      password: customer.password || null
    };
    customers.push(newCustomer);
    return newCustomer;
  }
  
  updateCustomerByEmail(email, updates) {
    const customer = this.getCustomerByEmail(email);
    if (customer) {
      Object.assign(customer, updates);
      return customer;
    }
    return undefined;
  }
  
  getAllCustomers() {
    return [...customers];
  }
  
  getCustomerByUserId(userId) {
    const user = this.getUserById(userId);
    if (!user || !user.customerId) return undefined;
    return this.getCustomer(user.customerId);
  }
  
  // Item methods
  getItem(id) {
    return items.find(i => i.id === id);
  }
  
  getItemByReferenceId(referenceId) {
    return items.find(i => i.referenceId === referenceId);
  }
  
  getItemsByCustomerId(customerId) {
    return items.filter(i => i.customerId === customerId);
  }
  
  createItem(item) {
    const newItem = {
      ...item,
      id: items.length + 1,
      referenceId: item.referenceId || `ITEM-${uuidv4().substring(0, 8).toUpperCase()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    items.push(newItem);
    return newItem;
  }
  
  updateItemStatus(id, status) {
    const item = this.getItem(id);
    if (item) {
      item.status = status;
      item.updatedAt = new Date();
      return item;
    }
    return undefined;
  }
  
  // Analysis methods
  getAnalysisByItemId(itemId) {
    return analyses.find(a => a.itemId === itemId);
  }
  
  createAnalysis(analysisData) {
    const newAnalysis = {
      ...analysisData,
      id: analyses.length + 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    analyses.push(newAnalysis);
    return newAnalysis;
  }
  
  // Pricing methods
  getPricingByItemId(itemId) {
    return pricings.find(p => p.itemId === itemId);
  }
  
  createPricing(pricingData) {
    const newPricing = {
      ...pricingData,
      id: pricings.length + 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    pricings.push(newPricing);
    return newPricing;
  }
  
  updatePricing(id, updates) {
    const pricing = pricings.find(p => p.id === id);
    if (pricing) {
      Object.assign(pricing, { ...updates, updatedAt: new Date() });
      return pricing;
    }
    return undefined;
  }
  
  // Shipping methods
  getShippingByItemId(itemId) {
    return shippings.find(s => s.itemId === itemId);
  }
  
  createShipping(shippingData) {
    const newShipping = {
      ...shippingData,
      id: shippings.length + 1,
      createdAt: new Date()
    };
    shippings.push(newShipping);
    return newShipping;
  }
  
  // Order methods
  getOrder(id) {
    return orders.find(o => o.id === id);
  }
  
  getOrderByNumber(orderNumber) {
    return orders.find(o => o.orderNumber === orderNumber);
  }
  
  getOrdersByCustomerId(customerId) {
    return orders.filter(o => o.customerId === customerId);
  }
  
  createOrder(order) {
    const newOrder = {
      ...order,
      id: orders.length + 1,
      orderNumber: order.orderNumber || `ORD-${uuidv4().substring(0, 8).toUpperCase()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    orders.push(newOrder);
    return newOrder;
  }
  
  updateOrder(id, updates) {
    const order = this.getOrder(id);
    if (order) {
      Object.assign(order, { ...updates, updatedAt: new Date() });
      return order;
    }
    return undefined;
  }
  
  getAllOrders() {
    return [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  
  // Order item methods
  getOrderItems(orderId) {
    return orderItems.filter(oi => oi.orderId === orderId);
  }
  
  addItemToOrder(orderId, itemId) {
    // Check if item is already in the order
    const existing = orderItems.find(oi => oi.orderId === orderId && oi.itemId === itemId);
    if (existing) return existing;
    
    const newOrderItem = {
      id: orderItems.length + 1,
      orderId,
      itemId,
      createdAt: new Date()
    };
    orderItems.push(newOrderItem);
    return newOrderItem;
  }
  
  removeItemFromOrder(orderId, itemId) {
    const index = orderItems.findIndex(oi => oi.orderId === orderId && oi.itemId === itemId);
    if (index !== -1) {
      orderItems.splice(index, 1);
      return true;
    }
    return false;
  }
  
  // Item with details methods
  getItemWithDetails(itemId) {
    const item = this.getItem(itemId);
    if (!item) return undefined;
    
    const analysis = this.getAnalysisByItemId(itemId);
    const pricing = this.getPricingByItemId(itemId);
    const shipping = this.getShippingByItemId(itemId);
    
    return {
      ...item,
      analysis,
      pricing,
      shipping
    };
  }
  
  getItemWithDetailsByReferenceId(referenceId) {
    const item = this.getItemByReferenceId(referenceId);
    if (!item) return undefined;
    return this.getItemWithDetails(item.id);
  }
  
  getAllItemsWithDetails() {
    return items.map(item => this.getItemWithDetails(item.id));
  }
  
  getItemsWithDetailsByCustomerId(customerId) {
    const customerItems = this.getItemsByCustomerId(customerId);
    return customerItems.map(item => this.getItemWithDetails(item.id));
  }
  
  getItemsForConsignorDashboard(customerId) {
    return this.getItemsWithDetailsByCustomerId(customerId).map(item => ({
      id: item.id,
      referenceId: item.referenceId,
      title: item.title,
      brand: item.brand,
      category: item.category,
      status: item.status,
      imageUrl: item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : null,
      createdAt: item.createdAt,
      suggestedPrice: item.pricing ? item.pricing.suggestedListingPrice : null,
      payout: item.pricing ? item.pricing.suggestedPayout : null
    }));
  }
  
  // Order with details methods
  getOrderWithDetails(orderId) {
    const order = this.getOrder(orderId);
    if (!order) return undefined;
    
    const orderItemsList = this.getOrderItems(orderId);
    const customer = this.getCustomer(order.customerId);
    
    // Get items with their details
    const items = [];
    for (const orderItem of orderItemsList) {
      const itemWithDetails = this.getItemWithDetails(orderItem.itemId);
      if (itemWithDetails) {
        items.push(itemWithDetails);
      }
    }
    
    return {
      ...order,
      customer,
      items,
      totalItems: orderItemsList.length,
      totalValue: order.totalValue || 0,
      totalPayout: order.totalPayout || 0
    };
  }
  
  getOrderWithDetailsByNumber(orderNumber) {
    const order = this.getOrderByNumber(orderNumber);
    if (!order) return undefined;
    return this.getOrderWithDetails(order.id);
  }
  
  getAllOrdersWithDetails() {
    return orders.map(order => this.getOrderWithDetails(order.id));
  }
  
  getOrdersWithDetailsByCustomerId(customerId) {
    const customerOrders = this.getOrdersByCustomerId(customerId);
    return customerOrders.map(order => this.getOrderWithDetails(order.id));
  }
  
  getOrderSummaries() {
    return orders.map(order => {
      const customer = this.getCustomer(order.customerId);
      const orderItemsList = this.getOrderItems(order.id);
      
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: customer ? customer.name : 'Unknown',
        customerEmail: customer ? customer.email : 'Unknown',
        status: order.status,
        createdAt: order.createdAt,
        totalItems: orderItemsList.length,
        totalValue: order.totalValue || 0,
        totalPayout: order.totalPayout || 0,
        trackingCode: order.trackingCode
      };
    });
  }
  
  searchOrders(query) {
    query = query.toLowerCase();
    
    // Search by order number
    const orderResults = orders.filter(order => 
      order.orderNumber.toLowerCase().includes(query)
    );
    
    // Search by customer details
    const customerIds = new Set(
      customers.filter(customer => 
        customer.name.toLowerCase().includes(query) || 
        customer.email.toLowerCase().includes(query)
      ).map(c => c.id)
    );
    
    const customerOrders = orders.filter(order => 
      customerIds.has(order.customerId)
    );
    
    // Combine results and remove duplicates
    const combinedResults = [...orderResults];
    for (const order of customerOrders) {
      if (!combinedResults.some(o => o.id === order.id)) {
        combinedResults.push(order);
      }
    }
    
    // Format as OrderSummary
    return combinedResults.map(order => {
      const customer = this.getCustomer(order.customerId);
      const orderItemsList = this.getOrderItems(order.id);
      
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: customer ? customer.name : 'Unknown',
        customerEmail: customer ? customer.email : 'Unknown',
        status: order.status,
        createdAt: order.createdAt,
        totalItems: orderItemsList.length,
        totalValue: order.totalValue || 0,
        totalPayout: order.totalPayout || 0,
        trackingCode: order.trackingCode
      };
    });
  }
  
  updateOrderTrackingCode(orderId, trackingCode) {
    return this.updateOrder(orderId, { trackingCode });
  }
  
  // ML Training methods
  getAllMlTrainingExamples() {
    return [...mlTrainingExamples];
  }
  
  getMlTrainingExampleById(id) {
    return mlTrainingExamples.find(e => e.id === id);
  }
  
  getMlTrainingExamplesByProductType(productType) {
    return mlTrainingExamples.filter(e => e.productType === productType);
  }
  
  createMlTrainingExample(example) {
    const newExample = {
      ...example,
      id: mlTrainingExamples.length + 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mlTrainingExamples.push(newExample);
    return newExample;
  }
  
  updateMlTrainingExample(id, updates) {
    const example = this.getMlTrainingExampleById(id);
    if (example) {
      Object.assign(example, { ...updates, updatedAt: new Date() });
      return example;
    }
    return undefined;
  }
  
  deleteMlTrainingExample(id) {
    const index = mlTrainingExamples.findIndex(e => e.id === id);
    if (index !== -1) {
      mlTrainingExamples.splice(index, 1);
      return true;
    }
    return false;
  }
  
  getVerifiedMlTrainingExamples() {
    return mlTrainingExamples.filter(e => e.verified);
  }
  
  // ML Model Config methods
  getAllMlModelConfigs() {
    return [...mlModelConfigs];
  }
  
  getMlModelConfigById(id) {
    return mlModelConfigs.find(c => c.id === id);
  }
  
  getMlModelConfigByModelId(modelId) {
    return mlModelConfigs.find(c => c.modelId === modelId);
  }
  
  createMlModelConfig(config) {
    const newConfig = {
      ...config,
      id: mlModelConfigs.length + 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mlModelConfigs.push(newConfig);
    return newConfig;
  }
  
  updateMlModelConfig(id, updates) {
    const config = this.getMlModelConfigById(id);
    if (config) {
      Object.assign(config, { ...updates, updatedAt: new Date() });
      return config;
    }
    return undefined;
  }
  
  getActiveMlModelConfig() {
    return mlModelConfigs.find(c => c.active);
  }
  
  setMlModelConfigActive(id, active) {
    // First deactivate all configs if activating this one
    if (active) {
      mlModelConfigs.forEach(c => {
        if (c.active) {
          c.active = false;
          c.updatedAt = new Date();
        }
      });
    }
    
    // Then update the specified config
    const config = this.getMlModelConfigById(id);
    if (config) {
      config.active = active;
      config.updatedAt = new Date();
      return config;
    }
    return undefined;
  }
  
  // ML Training Session methods
  getAllMlTrainingSessions() {
    return [...mlTrainingSessions];
  }
  
  getMlTrainingSessionById(id) {
    return mlTrainingSessions.find(s => s.id === id);
  }
  
  getMlTrainingSessionsByModelConfigId(modelConfigId) {
    return mlTrainingSessions.filter(s => s.modelConfigId === modelConfigId);
  }
  
  createMlTrainingSession(sessionData) {
    const newSession = {
      ...sessionData,
      id: mlTrainingSessions.length + 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mlTrainingSessions.push(newSession);
    return newSession;
  }
  
  updateMlTrainingSessionStatus(id, status, metrics, logs) {
    const session = this.getMlTrainingSessionById(id);
    if (session) {
      session.status = status;
      session.updatedAt = new Date();
      
      if (metrics) {
        session.metrics = metrics;
      }
      
      if (logs) {
        session.logs = logs;
      }
      
      return session;
    }
    return undefined;
  }
  
  // Dashboard methods
  getDashboardStats() {
    // Count items by status
    const statusCounts = {};
    items.forEach(item => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    });
    
    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
    
    // Calculate monthly sales
    const monthlySales = [];
    const monthlyData = {};
    
    orders.forEach(order => {
      if (order.status === 'completed' && order.totalValue) {
        const month = order.createdAt.toISOString().substring(0, 7); // Format: YYYY-MM
        monthlyData[month] = (monthlyData[month] || 0) + Number(order.totalValue);
      }
    });
    
    Object.entries(monthlyData).forEach(([month, sales]) => {
      monthlySales.push({ month, sales });
    });
    
    // Sort monthlySales by date
    monthlySales.sort((a, b) => a.month.localeCompare(b.month));
    
    return {
      totalItems: items.length,
      totalOrders: orders.length,
      totalSales: orders.reduce((sum, order) => sum + (order.totalValue || 0), 0),
      totalPayout: orders.reduce((sum, order) => sum + (order.totalPayout || 0), 0),
      statusDistribution,
      monthlySales
    };
  }
  
  getConsignorStats(consignorId) {
    const customerItems = this.getItemsByCustomerId(consignorId);
    const customerOrders = this.getOrdersByCustomerId(consignorId);
    
    // Count items by status
    const statusCounts = {};
    customerItems.forEach(item => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    });
    
    const itemsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
    
    // Calculate total payout
    const totalPayout = customerOrders.reduce((sum, order) => sum + (order.totalPayout || 0), 0);
    
    return {
      totalItems: customerItems.length,
      itemsByStatus,
      totalOrders: customerOrders.length,
      totalPayout
    };
  }
  
  // Admin methods
  getAdminStats() {
    return this.getDashboardStats();
  }
  
  getConsignorDetails(userId) {
    const user = this.getUserById(userId);
    if (!user) return undefined;
    
    const customer = this.getCustomerByUserId(userId);
    if (!customer) return undefined;
    
    const stats = this.getConsignorStats(customer.id);
    const recentItems = this.getItemsWithDetailsByCustomerId(customer.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
    
    const recentOrders = this.getOrdersWithDetailsByCustomerId(customer.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
    
    return {
      user,
      customer,
      stats,
      recentItems,
      recentOrders
    };
  }
}

export const storage = new MemStorage();