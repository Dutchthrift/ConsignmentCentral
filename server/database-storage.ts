import { 
  customers, Customer, InsertCustomer,
  items, Item, InsertItem, 
  analyses, Analysis, InsertAnalysis,
  pricing, Pricing, InsertPricing,
  shipping, Shipping, InsertShipping,
  orders, Order, InsertOrder,
  orderItems, OrderItem, InsertOrderItem,
  OrderWithDetails, OrderSummary,
  mlTrainingExamples, MlTrainingExample, InsertMlTrainingExample,
  mlModelConfigs, MlModelConfig, InsertMlModelConfig,
  mlTrainingSessions, MlTrainingSession, InsertMlTrainingSession,
  users, User, InsertUser,
  adminUsers, AdminUser, InsertAdminUser,
  UserRole, UserType,
  ItemWithDetails, DashboardStats
} from "@shared/schema";
import { db } from "./db";
import { IStorage } from "./storage";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  // Direct method for consignor dashboard
  async getItemsForConsignorDashboard(customerId: number): Promise<any[]> {
    try {
      // This uses our getItemsWithDetailsByCustomerId method to fetch all data
      const customerItems = await this.getItemsWithDetailsByCustomerId(customerId);
      
      // Format for dashboard view
      return customerItems.map(item => ({
        id: item.id,
        referenceId: item.referenceId,
        title: item.title,
        status: item.status,
        createdAt: item.createdAt,
        imageUrl: item.imageUrl,
        analysis: item.analysis ? {
          brand: item.analysis.brand,
          condition: item.analysis.condition,
          productType: item.analysis.productType
        } : null,
        pricing: item.pricing ? {
          averageMarketPrice: item.pricing.averageMarketPrice,
          suggestedListingPrice: item.pricing.suggestedListingPrice,
          suggestedPayout: item.pricing.suggestedPayout,
          commissionRate: item.pricing.commissionRate,
          finalSalePrice: item.pricing.finalSalePrice,
          finalPayout: item.pricing.finalPayout
        } : null
      }));
    } catch (error) {
      console.error("Error fetching items for consignor dashboard:", error);
      return [];
    }
  }
  
  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async updateCustomerByEmail(email: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    const [updatedCustomer] = await db
      .update(customers)
      .set(updates)
      .where(eq(customers.email, email))
      .returning();
    return updatedCustomer;
  }
  
  async getCustomerByUserId(userId: number): Promise<Customer | undefined> {
    // First get the user to find the customer ID
    const user = await this.getUserById(userId);
    if (!user || !user.customerId) return undefined;
    
    // Then get the customer with that ID
    return await this.getCustomer(user.customerId);
  }

  // Item methods
  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }

  async getItemByReferenceId(referenceId: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.referenceId, referenceId));
    return item;
  }

  async getItemsByCustomerId(customerId: number): Promise<Item[]> {
    return await db.select().from(items).where(eq(items.customerId, customerId));
  }

  async createItem(item: InsertItem): Promise<Item> {
    const [newItem] = await db.insert(items).values(item).returning();
    return newItem;
  }

  async updateItemStatus(id: number, status: string): Promise<Item | undefined> {
    const [updatedItem] = await db.update(items)
      .set({ status, updatedAt: new Date() })
      .where(eq(items.id, id))
      .returning();
    return updatedItem;
  }

  // Analysis methods
  async getAnalysisByItemId(itemId: number): Promise<Analysis | undefined> {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.itemId, itemId));
    return analysis;
  }

  async createAnalysis(analysis: InsertAnalysis): Promise<Analysis> {
    const [newAnalysis] = await db.insert(analyses).values(analysis).returning();
    return newAnalysis;
  }

  // Pricing methods
  async getPricingByItemId(itemId: number): Promise<Pricing | undefined> {
    const [pricingItem] = await db.select().from(pricing).where(eq(pricing.itemId, itemId));
    return pricingItem;
  }

  async createPricing(pricingData: InsertPricing): Promise<Pricing> {
    const [newPricing] = await db.insert(pricing).values(pricingData).returning();
    return newPricing;
  }

  async updatePricing(id: number, updates: Partial<Pricing>): Promise<Pricing | undefined> {
    const [updatedPricing] = await db.update(pricing)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pricing.id, id))
      .returning();
    return updatedPricing;
  }

  // Shipping methods
  async getShippingByItemId(itemId: number): Promise<Shipping | undefined> {
    const [shippingItem] = await db.select().from(shipping).where(eq(shipping.itemId, itemId));
    return shippingItem;
  }

  async createShipping(shippingData: InsertShipping): Promise<Shipping> {
    const [newShipping] = await db.insert(shipping).values(shippingData).returning();
    return newShipping;
  }

  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
    return order;
  }

  async getOrdersByCustomerId(customerId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.customerId, customerId));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders);
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async addItemToOrder(orderId: number, itemId: number): Promise<OrderItem> {
    const [newOrderItem] = await db
      .insert(orderItems)
      .values({ orderId, itemId })
      .returning();
    return newOrderItem;
  }

  async removeItemFromOrder(orderId: number, itemId: number): Promise<boolean> {
    const result = await db
      .delete(orderItems)
      .where(
        and(
          eq(orderItems.orderId, orderId),
          eq(orderItems.itemId, itemId)
        )
      );
    return result.rowCount > 0;
  }

  async getOrderWithDetails(orderId: number): Promise<OrderWithDetails | undefined> {
    // Get the order
    const order = await this.getOrder(orderId);
    if (!order) return undefined;

    // Get the customer
    const customer = await this.getCustomer(order.customerId);
    if (!customer) return undefined;

    // Get the order items
    const orderItemsList = await this.getOrderItems(orderId);
    
    // Get the items with details
    const items = await Promise.all(
      orderItemsList.map(async (orderItem) => {
        const item = await this.getItem(orderItem.itemId);
        if (!item) return null;

        const analysis = await this.getAnalysisByItemId(item.id);
        const pricing = await this.getPricingByItemId(item.id);
        const shipping = await this.getShippingByItemId(item.id);

        return {
          ...item,
          analysis,
          pricing,
          shipping
        };
      })
    );

    // Filter out null items
    const validItems = items.filter(Boolean) as (Item & {
      analysis?: Analysis;
      pricing?: Pricing;
      shipping?: Shipping;
    })[];

    return {
      ...order,
      customer,
      items: validItems
    };
  }

  async getOrderWithDetailsByNumber(orderNumber: string): Promise<OrderWithDetails | undefined> {
    const order = await this.getOrderByNumber(orderNumber);
    if (!order) return undefined;
    return this.getOrderWithDetails(order.id);
  }

  async getAllOrdersWithDetails(): Promise<OrderWithDetails[]> {
    const orders = await this.getAllOrders();
    return Promise.all(
      orders.map(order => this.getOrderWithDetails(order.id))
    ).then(results => results.filter(Boolean) as OrderWithDetails[]);
  }

  async getOrdersWithDetailsByCustomerId(customerId: number): Promise<OrderWithDetails[]> {
    const orders = await this.getOrdersByCustomerId(customerId);
    return Promise.all(
      orders.map(order => this.getOrderWithDetails(order.id))
    ).then(results => results.filter(Boolean) as OrderWithDetails[]);
  }

  async getOrderSummaries(): Promise<OrderSummary[]> {
    // Get all orders with their details
    const ordersWithDetails = await this.getAllOrdersWithDetails();

    // Map to order summaries
    return ordersWithDetails.map(order => {
      const totalValue = order.totalValue || 
        order.items.reduce((sum, item) => sum + (item.pricing?.suggestedListingPrice || 0), 0);
      
      const totalPayout = order.totalPayout || 
        order.items.reduce((sum, item) => sum + (item.pricing?.suggestedPayout || 0), 0);

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        submissionDate: order.submissionDate.toISOString(),
        status: order.status,
        trackingCode: order.trackingCode || undefined,
        totalValue,
        totalPayout,
        itemCount: order.items.length
      };
    });
  }

  async searchOrders(query: string): Promise<OrderSummary[]> {
    // Get all order summaries
    const allSummaries = await this.getOrderSummaries();
    
    // Normalize the query
    const normalizedQuery = query.toLowerCase().trim();
    
    // Filter based on the query
    return allSummaries.filter(summary => 
      summary.orderNumber.toLowerCase().includes(normalizedQuery) ||
      summary.customerName.toLowerCase().includes(normalizedQuery) ||
      summary.customerEmail.toLowerCase().includes(normalizedQuery) ||
      (summary.trackingCode && summary.trackingCode.toLowerCase().includes(normalizedQuery))
    );
  }

  async updateOrderTrackingCode(orderId: number, trackingCode: string): Promise<Order | undefined> {
    return this.updateOrder(orderId, { trackingCode });
  }

  // ML Training Example methods
  async getAllMlTrainingExamples(): Promise<MlTrainingExample[]> {
    return await db.select().from(mlTrainingExamples);
  }

  async getMlTrainingExampleById(id: number): Promise<MlTrainingExample | undefined> {
    const [example] = await db.select().from(mlTrainingExamples).where(eq(mlTrainingExamples.id, id));
    return example;
  }

  async getMlTrainingExamplesByProductType(productType: string): Promise<MlTrainingExample[]> {
    return await db.select().from(mlTrainingExamples).where(eq(mlTrainingExamples.productType, productType));
  }

  async createMlTrainingExample(example: InsertMlTrainingExample): Promise<MlTrainingExample> {
    const [newExample] = await db.insert(mlTrainingExamples).values(example).returning();
    return newExample;
  }

  async updateMlTrainingExample(id: number, updates: Partial<MlTrainingExample>): Promise<MlTrainingExample | undefined> {
    const [updatedExample] = await db.update(mlTrainingExamples)
      .set(updates)
      .where(eq(mlTrainingExamples.id, id))
      .returning();
    return updatedExample;
  }

  async deleteMlTrainingExample(id: number): Promise<boolean> {
    const result = await db.delete(mlTrainingExamples).where(eq(mlTrainingExamples.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getVerifiedMlTrainingExamples(): Promise<MlTrainingExample[]> {
    return await db.select().from(mlTrainingExamples).where(eq(mlTrainingExamples.isVerified, true));
  }

  // ML Model Config methods
  async getAllMlModelConfigs(): Promise<MlModelConfig[]> {
    return await db.select().from(mlModelConfigs);
  }

  async getMlModelConfigById(id: number): Promise<MlModelConfig | undefined> {
    const [config] = await db.select().from(mlModelConfigs).where(eq(mlModelConfigs.id, id));
    return config;
  }

  async getMlModelConfigByModelId(modelId: string): Promise<MlModelConfig | undefined> {
    const [config] = await db.select().from(mlModelConfigs).where(eq(mlModelConfigs.modelId, modelId));
    return config;
  }

  async createMlModelConfig(config: InsertMlModelConfig): Promise<MlModelConfig> {
    const [newConfig] = await db.insert(mlModelConfigs).values(config).returning();
    return newConfig;
  }

  async updateMlModelConfig(id: number, updates: Partial<MlModelConfig>): Promise<MlModelConfig | undefined> {
    const [updatedConfig] = await db.update(mlModelConfigs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(mlModelConfigs.id, id))
      .returning();
    return updatedConfig;
  }

  async getActiveMlModelConfig(): Promise<MlModelConfig | undefined> {
    const [config] = await db.select().from(mlModelConfigs).where(eq(mlModelConfigs.isActive, true));
    return config;
  }

  async setMlModelConfigActive(id: number, active: boolean): Promise<MlModelConfig | undefined> {
    // First, set all configs to inactive if we're activating one
    if (active) {
      await db.update(mlModelConfigs).set({ isActive: false });
    }
    
    // Then update the specific config
    const [updatedConfig] = await db.update(mlModelConfigs)
      .set({ isActive: active, updatedAt: new Date() })
      .where(eq(mlModelConfigs.id, id))
      .returning();
    
    return updatedConfig;
  }

  // ML Training Session methods
  async getAllMlTrainingSessions(): Promise<MlTrainingSession[]> {
    return await db.select().from(mlTrainingSessions);
  }

  async getMlTrainingSessionById(id: number): Promise<MlTrainingSession | undefined> {
    const [session] = await db.select().from(mlTrainingSessions).where(eq(mlTrainingSessions.id, id));
    return session;
  }

  async getMlTrainingSessionsByModelConfigId(modelConfigId: number): Promise<MlTrainingSession[]> {
    return await db.select().from(mlTrainingSessions).where(eq(mlTrainingSessions.modelConfigId, modelConfigId));
  }

  async createMlTrainingSession(session: InsertMlTrainingSession): Promise<MlTrainingSession> {
    const [newSession] = await db.insert(mlTrainingSessions).values(session).returning();
    return newSession;
  }

  async updateMlTrainingSessionStatus(
    id: number, 
    status: string, 
    updates?: Partial<MlTrainingSession>
  ): Promise<MlTrainingSession | undefined> {
    const [updatedSession] = await db.update(mlTrainingSessions)
      .set({ 
        ...updates, 
        status,
        ...(status === 'completed' ? { completedAt: new Date() } : {})
      })
      .where(eq(mlTrainingSessions.id, id))
      .returning();
    
    return updatedSession;
  }

  // Composite methods
  async getItemWithDetails(itemId: number): Promise<ItemWithDetails | undefined> {
    const item = await this.getItem(itemId);
    if (!item) return undefined;

    const customer = await this.getCustomer(item.customerId);
    if (!customer) return undefined;

    const analysis = await this.getAnalysisByItemId(itemId);
    const pricingInfo = await this.getPricingByItemId(itemId);
    const shippingInfo = await this.getShippingByItemId(itemId);

    return {
      ...item,
      customer,
      analysis,
      pricing: pricingInfo,
      shipping: shippingInfo
    };
  }

  async getItemWithDetailsByReferenceId(referenceId: string): Promise<ItemWithDetails | undefined> {
    const item = await this.getItemByReferenceId(referenceId);
    if (!item) return undefined;
    return this.getItemWithDetails(item.id);
  }

  async getAllItemsWithDetails(): Promise<ItemWithDetails[]> {
    const allItems = await db.select().from(items);
    const result: ItemWithDetails[] = [];

    for (const item of allItems) {
      const details = await this.getItemWithDetails(item.id);
      if (details) {
        result.push(details);
      }
    }

    return result;
  }

  async getItemsWithDetailsByCustomerId(customerId: number): Promise<ItemWithDetails[]> {
    const customerItems = await this.getItemsByCustomerId(customerId);
    const result: ItemWithDetails[] = [];

    for (const item of customerItems) {
      const details = await this.getItemWithDetails(item.id);
      if (details) {
        result.push(details);
      }
    }

    return result;
  }

  // Dashboard methods
  async getDashboardStats(): Promise<DashboardStats> {
    // Count items by status
    const itemsByStatus = await db.select({
      status: items.status,
      count: count()
    })
    .from(items)
    .groupBy(items.status);

    const statusDistribution = itemsByStatus.map(item => ({
      status: item.status,
      count: Number(item.count)
    }));

    // Total intakes
    const [totalIntakesResult] = await db.select({
      count: count()
    })
    .from(items);

    // Items sold
    const [soldItemsResult] = await db.select({
      count: count()
    })
    .from(items)
    .where(eq(items.status, 'sold'));

    // Get monthly sales (this is a simplified version)
    // In a real implementation, you would use more complex date queries
    const monthlySales = await db.select({
      month: sql<string>`to_char(${items.updatedAt}, 'YYYY-MM')`,
      count: count(),
      total: sql<number>`sum(CASE WHEN ${pricing.suggestedListingPrice} IS NOT NULL THEN ${pricing.suggestedListingPrice} ELSE 0 END)`
    })
    .from(items)
    .leftJoin(pricing, eq(items.id, pricing.itemId))
    .where(eq(items.status, 'sold'))
    .groupBy(sql`to_char(${items.updatedAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${items.updatedAt}, 'YYYY-MM')`);

    const formattedMonthlySales = monthlySales.map(sale => ({
      month: sale.month,
      count: Number(sale.count),
      total: Number(sale.total || 0)
    }));

    return {
      totalIntakes: Number(totalIntakesResult.count),
      soldItems: Number(soldItemsResult?.count || 0),
      statusDistribution,
      monthlySalesData: formattedMonthlySales,
    };
  }

  async getConsignorStats(consignorId: number): Promise<{
    totalItems: number;
    totalSales: number;
    itemsPerStatus: Record<string, number>;
  }> {
    // Count total items
    const [totalItemsResult] = await db.select({
      count: count()
    })
    .from(items)
    .where(eq(items.customerId, consignorId));

    // Calculate total sales
    const [totalSalesResult] = await db.select({
      total: sql<number>`sum(CASE WHEN ${pricing.suggestedListingPrice} IS NOT NULL THEN ${pricing.suggestedListingPrice} ELSE 0 END)`
    })
    .from(items)
    .leftJoin(pricing, eq(items.id, pricing.itemId))
    .where(and(
      eq(items.customerId, consignorId),
      eq(items.status, 'sold')
    ));

    // Count items by status
    const itemsByStatus = await db.select({
      status: items.status,
      count: count()
    })
    .from(items)
    .where(eq(items.customerId, consignorId))
    .groupBy(items.status);

    // Convert to Record format
    const itemsPerStatus: Record<string, number> = {};
    itemsByStatus.forEach(item => {
      itemsPerStatus[item.status] = Number(item.count);
    });

    return {
      totalItems: Number(totalItemsResult.count),
      totalSales: Number(totalSalesResult?.total || 0),
      itemsPerStatus
    };
  }

  // User methods
  async getUserById(id: number): Promise<User | undefined> {
    // For compatibility with older database schema, use a simplified query
    // that doesn't include the user_type column
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      password: users.password,
      role: users.role,
      provider: users.provider,
      externalId: users.externalId,
      profileImageUrl: users.profileImageUrl,
      lastLogin: users.lastLogin,
      createdAt: users.createdAt,
      customerId: users.customerId,
    }).from(users).where(eq(users.id, id));
    
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // For compatibility with older database schema, use a simplified query
    // that doesn't include the user_type column
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      password: users.password,
      role: users.role,
      provider: users.provider,
      externalId: users.externalId,
      profileImageUrl: users.profileImageUrl,
      lastLogin: users.lastLogin,
      createdAt: users.createdAt,
      customerId: users.customerId,
    }).from(users).where(eq(users.email, email));
    
    return user;
  }

  async getUserByExternalId(externalId: string, provider: string): Promise<User | undefined> {
    // For compatibility with older database schema, use a simplified query
    // that doesn't include the user_type column
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      password: users.password,
      role: users.role,
      provider: users.provider,
      externalId: users.externalId,
      profileImageUrl: users.profileImageUrl,
      lastLogin: users.lastLogin,
      createdAt: users.createdAt,
      customerId: users.customerId,
    }).from(users).where(
      and(
        eq(users.externalId, externalId),
        eq(users.provider, provider)
      )
    );
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    // Create a new object without userType to prevent database errors
    const { userType, ...userWithoutType } = user;
    
    const [newUser] = await db.insert(users).values(userWithoutType).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      password: users.password,
      role: users.role,
      provider: users.provider,
      externalId: users.externalId,
      profileImageUrl: users.profileImageUrl,
      lastLogin: users.lastLogin,
      createdAt: users.createdAt,
      customerId: users.customerId,
    });
    
    return newUser;
  }

  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserExternalId(id: number, externalId: string, provider: string): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({ externalId, provider })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
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
    const [updatedUser] = await db.update(users)
      .set({ customerId })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async getAdminStats(): Promise<any> {
    // Count total users
    const [totalUsersResult] = await db.select({
      count: count()
    }).from(users);

    // Count consignors
    const [totalConsignorsResult] = await db.select({
      count: count()
    })
    .from(users)
    .where(eq(users.role, 'consignor'));

    // Count admins
    const [totalAdminsResult] = await db.select({
      count: count()
    })
    .from(users)
    .where(eq(users.role, 'admin'));

    // Count total items
    const [totalItemsResult] = await db.select({
      count: count()
    }).from(items);

    // Count items by status
    const itemsByStatus = await db.select({
      status: items.status,
      count: count()
    })
    .from(items)
    .groupBy(items.status);

    // Map status counts to variables
    const pendingItems = itemsByStatus.find(i => i.status === 'pending')?.count || 0;
    const approvedItems = itemsByStatus.find(i => i.status === 'approved')?.count || 0;
    const rejectedItems = itemsByStatus.find(i => i.status === 'rejected')?.count || 0;
    
    // Get active consignors (those with at least one item)
    const activeConsignorsQuery = db.select({
      customerId: items.customerId
    })
    .from(items)
    .groupBy(items.customerId);
    
    const activeConsignors = (await activeConsignorsQuery).length;

    // Calculate average values and sales data (simplified for now)
    // In a real implementation, these would come from actual sales data
    const inventoryValue = 250000; // €2,500 in cents
    const monthlyRevenue = 150000; // €1,500 in cents
    const totalSales = 1200000; // €12,000 in cents
    const totalPayouts = 840000; // €8,400 in cents
    const pendingPayouts = 60000; // €600 in cents

    return {
      totalItems: Number(totalItemsResult.count),
      pendingItems: Number(pendingItems),
      approvedItems: Number(approvedItems),
      rejectedItems: Number(rejectedItems),
      totalConsignors: Number(totalConsignorsResult.count),
      activeConsignors: Number(activeConsignors),
      totalSales: totalSales,
      monthlyRevenue: monthlyRevenue,
      totalPayouts: totalPayouts,
      pendingPayouts: pendingPayouts,
      inventoryValue: inventoryValue,
      totalUsers: Number(totalUsersResult.count),
      totalAdmins: Number(totalAdminsResult.count)
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

  // Admin User methods
  async getAdminUserById(id: number): Promise<AdminUser | undefined> {
    const [adminUser] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return adminUser;
  }
  
  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    const [adminUser] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return adminUser;
  }
  
  async getAdminUserByExternalId(externalId: string, provider: string): Promise<AdminUser | undefined> {
    const [adminUser] = await db.select().from(adminUsers)
      .where(and(
        eq(adminUsers.externalId, externalId),
        eq(adminUsers.provider, provider)
      ));
    return adminUser;
  }
  
  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    const [newAdminUser] = await db.insert(adminUsers).values({
      ...user,
      role: UserRole.ADMIN
    }).returning();
    return newAdminUser;
  }
  
  async updateAdminUserLastLogin(id: number): Promise<AdminUser | undefined> {
    const [updatedAdminUser] = await db.update(adminUsers)
      .set({ lastLogin: new Date() })
      .where(eq(adminUsers.id, id))
      .returning();
    return updatedAdminUser;
  }
  
  async updateAdminUserExternalId(id: number, externalId: string, provider: string): Promise<AdminUser | undefined> {
    const [updatedAdminUser] = await db.update(adminUsers)
      .set({ externalId, provider })
      .where(eq(adminUsers.id, id))
      .returning();
    return updatedAdminUser;
  }
  
  async getAllAdminUsers(): Promise<AdminUser[]> {
    return await db.select().from(adminUsers);
  }
}