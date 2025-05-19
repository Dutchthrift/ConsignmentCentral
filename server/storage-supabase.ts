import { Pool } from '@neondatabase/serverless';
import { 
  customers, users, adminUsers, items, 
  mlTrainingExamples, mlModelConfigs, mlTrainingSessions,
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
import { IStorage } from "./storage-interface";
import { db, pool } from "./db-config";
import { eq, and, like, ilike, desc, asc, sql, or, inArray } from "drizzle-orm";
import session from 'express-session';
import connectPg from 'connect-pg-simple';

const PostgresSessionStore = connectPg(session);

export class SupabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    console.log('Using Supabase connection pooling for reliable database access');
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: 'session' // Use a custom table name for sessions
    });
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

  async updateCustomerByEmail(email: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    try {
      const [updatedCustomer] = await db
        .update(customers)
        .set(updates)
        .where(eq(customers.email, email))
        .returning();
      return updatedCustomer;
    } catch (error) {
      console.error("Error updating customer:", error);
      // Return the existing customer without updates as fallback
      return this.getCustomerByEmail(email);
    }
  }

  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async getCustomerByUserId(userId: number): Promise<Customer | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.customerId) return undefined;
    return this.getCustomer(user.customerId);
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
    try {
      // Use the pool that's already imported at the top of the file
      // Get a client from the shared pool
      const client = await pool.connect();
      
      try {
        const columns = Object.keys(item);
        
        // Convert camelCase to snake_case for SQL
        const sqlColumns = columns.map(col => {
          return col.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        });
        
        const values = Object.values(item);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `
          INSERT INTO items (${sqlColumns.join(', ')}) 
          VALUES (${placeholders}) 
          RETURNING *
        `;
        
        const result = await client.query(query, values);
        
        if (result.rows && result.rows.length > 0) {
          // Convert column names from snake_case back to camelCase for our application
          const row = result.rows[0];
          const newItem: any = {};
          
          // Convert snake_case column names back to camelCase
          Object.keys(row).forEach(key => {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            newItem[camelKey] = row[key];
          });
          
          return newItem as Item;
        }
        
        throw new Error("Failed to create item, no result returned");
      } finally {
        client.release(); // Release the client back to the pool
      }
    } catch (error) {
      console.error("Error creating item:", error);
      throw error;
    }
  }

  async updateItemStatus(id: number, status: string): Promise<Item | undefined> {
    const [updatedItem] = await db
      .update(items)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(items.id, id))
      .returning();
    return updatedItem;
  }
  
  async updateItemImage(id: number, imageBase64: string): Promise<Item | undefined> {
    // Use direct SQL update for image since we know the correct column name
    try {
      // Use the existing pool connection
      const client = await pool.connect();
      
      try {
        // Log the query parameters for debugging
        console.log(`Updating image for item ${id}, image data length: ${imageBase64 ? imageBase64.length : 0}`);
        
        // Direct SQL update using the correct column name (image_url)
        const query = `
          UPDATE items 
          SET image_url = $1, 
              updated_at = NOW() 
          WHERE id = $2 
          RETURNING *
        `;
        
        const result = await client.query(query, [imageBase64, id]);
        
        if (result.rows && result.rows.length > 0) {
          // Convert snake_case column names to camelCase for our application
          const row = result.rows[0];
          const updatedItem: any = {};
          
          Object.keys(row).forEach(key => {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            updatedItem[camelKey] = row[key];
          });
          
          return updatedItem as Item;
        }
        
        return undefined;
      } finally {
        client.release(); // Return the client to the pool
      }
    } catch (error) {
      console.error('Error updating item image:', error);
      throw error;
    }
  }

  // Analysis methods
  async getAnalysisByItemId(itemId: number): Promise<Analysis | undefined> {
    const [analysisResult] = await db.select().from(analysis).where(eq(analysis.itemId, itemId));
    return analysisResult;
  }

  async createAnalysis(analysisData: InsertAnalysis): Promise<Analysis> {
    const [newAnalysis] = await db.insert(analysis).values(analysisData).returning();
    return newAnalysis;
  }

  // Pricing methods
  async getPricingByItemId(itemId: number): Promise<Pricing | undefined> {
    const [pricingResult] = await db.select().from(pricing).where(eq(pricing.itemId, itemId));
    return pricingResult;
  }

  async createPricing(pricingData: InsertPricing): Promise<Pricing> {
    const [newPricing] = await db.insert(pricing).values(pricingData).returning();
    return newPricing;
  }

  async updatePricing(id: number, updates: Partial<Pricing>): Promise<Pricing | undefined> {
    const [updatedPricing] = await db
      .update(pricing)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(pricing.id, id))
      .returning();
    return updatedPricing;
  }

  // Shipping methods
  async getShippingByItemId(itemId: number): Promise<Shipping | undefined> {
    const [shippingResult] = await db.select().from(shipping).where(eq(shipping.itemId, itemId));
    return shippingResult;
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
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async addItemToOrder(orderId: number, itemId: number): Promise<OrderItem> {
    const [orderItem] = await db
      .insert(orderItems)
      .values({
        orderId,
        itemId,
        createdAt: new Date()
      })
      .returning();
    return orderItem;
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
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getOrderWithDetails(orderId: number): Promise<OrderWithDetails | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return undefined;

    const orderItemsList = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const customer = await this.getCustomer(order.customerId);
    
    // Get items with their details
    const itemDetails: ItemWithDetails[] = [];
    for (const orderItem of orderItemsList) {
      const item = await this.getItem(orderItem.itemId);
      if (item) {
        const analysis = await this.getAnalysisByItemId(item.id);
        const pricing = await this.getPricingByItemId(item.id);
        const shipping = await this.getShippingByItemId(item.id);
        
        itemDetails.push({
          ...item,
          analysis,
          pricing,
          shipping
        });
      }
    }

    return {
      ...order,
      customer,
      items: itemDetails,
      totalItems: orderItemsList.length,
      totalValue: order.totalValue || 0,
      totalPayout: order.totalPayout || 0
    };
  }

  async getOrderWithDetailsByNumber(orderNumber: string): Promise<OrderWithDetails | undefined> {
    const order = await this.getOrderByNumber(orderNumber);
    if (!order) return undefined;
    return this.getOrderWithDetails(order.id);
  }

  async getAllOrdersWithDetails(): Promise<OrderWithDetails[]> {
    const allOrders = await this.getAllOrders();
    const ordersWithDetails: OrderWithDetails[] = [];
    
    for (const order of allOrders) {
      const orderWithDetails = await this.getOrderWithDetails(order.id);
      if (orderWithDetails) {
        ordersWithDetails.push(orderWithDetails);
      }
    }
    
    return ordersWithDetails;
  }

  async getOrdersWithDetailsByCustomerId(customerId: number): Promise<OrderWithDetails[]> {
    const customerOrders = await this.getOrdersByCustomerId(customerId);
    const ordersWithDetails: OrderWithDetails[] = [];
    
    for (const order of customerOrders) {
      const orderWithDetails = await this.getOrderWithDetails(order.id);
      if (orderWithDetails) {
        ordersWithDetails.push(orderWithDetails);
      }
    }
    
    return ordersWithDetails;
  }

  async getOrderSummaries(): Promise<OrderSummary[]> {
    const allOrders = await this.getAllOrders();
    const summaries: OrderSummary[] = [];
    
    for (const order of allOrders) {
      const customer = await this.getCustomer(order.customerId);
      const orderItems = await this.getOrderItems(order.id);
      
      summaries.push({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: customer?.name || 'Unknown',
        customerEmail: customer?.email || 'Unknown',
        status: order.status,
        createdAt: order.createdAt,
        totalItems: orderItems.length,
        totalValue: order.totalValue || 0,
        totalPayout: order.totalPayout || 0,
        trackingCode: order.trackingCode
      });
    }
    
    return summaries;
  }

  async searchOrders(query: string): Promise<OrderSummary[]> {
    // First search for orders by order number
    const orderResults = await db
      .select()
      .from(orders)
      .where(ilike(orders.orderNumber, `%${query}%`));
    
    // Then search for orders by customer details
    const customerIds = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        or(
          ilike(customers.name, `%${query}%`),
          ilike(customers.email, `%${query}%`)
        )
      );
    
    const customerIdList = customerIds.map(c => c.id);
    let customerOrders: Order[] = [];
    
    if (customerIdList.length > 0) {
      customerOrders = await db
        .select()
        .from(orders)
        .where(inArray(orders.customerId, customerIdList));
    }
    
    // Combine and deduplicate results
    const combinedOrders = [...orderResults];
    for (const order of customerOrders) {
      if (!combinedOrders.some(o => o.id === order.id)) {
        combinedOrders.push(order);
      }
    }
    
    // Format results as OrderSummary
    const summaries: OrderSummary[] = [];
    for (const order of combinedOrders) {
      const customer = await this.getCustomer(order.customerId);
      const orderItems = await this.getOrderItems(order.id);
      
      summaries.push({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: customer?.name || 'Unknown',
        customerEmail: customer?.email || 'Unknown',
        status: order.status,
        createdAt: order.createdAt,
        totalItems: orderItems.length,
        totalValue: order.totalValue || 0,
        totalPayout: order.totalPayout || 0,
        trackingCode: order.trackingCode
      });
    }
    
    return summaries;
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
    return await db
      .select()
      .from(mlTrainingExamples)
      .where(eq(mlTrainingExamples.productType, productType));
  }

  async createMlTrainingExample(example: InsertMlTrainingExample): Promise<MlTrainingExample> {
    const [newExample] = await db.insert(mlTrainingExamples).values(example).returning();
    return newExample;
  }

  async updateMlTrainingExample(id: number, updates: Partial<MlTrainingExample>): Promise<MlTrainingExample | undefined> {
    const [updatedExample] = await db
      .update(mlTrainingExamples)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(mlTrainingExamples.id, id))
      .returning();
    return updatedExample;
  }

  async deleteMlTrainingExample(id: number): Promise<boolean> {
    const result = await db
      .delete(mlTrainingExamples)
      .where(eq(mlTrainingExamples.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getVerifiedMlTrainingExamples(): Promise<MlTrainingExample[]> {
    return await db
      .select()
      .from(mlTrainingExamples)
      .where(eq(mlTrainingExamples.verified, true));
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
    const [updatedConfig] = await db
      .update(mlModelConfigs)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(mlModelConfigs.id, id))
      .returning();
    return updatedConfig;
  }

  async getActiveMlModelConfig(): Promise<MlModelConfig | undefined> {
    const [config] = await db
      .select()
      .from(mlModelConfigs)
      .where(eq(mlModelConfigs.active, true));
    return config;
  }

  async setMlModelConfigActive(id: number, active: boolean): Promise<MlModelConfig | undefined> {
    // First deactivate all other configs if activating this one
    if (active) {
      await db
        .update(mlModelConfigs)
        .set({
          active: false,
          updatedAt: new Date()
        })
        .where(eq(mlModelConfigs.active, true));
    }
    
    // Then update the specified config
    const [updatedConfig] = await db
      .update(mlModelConfigs)
      .set({
        active,
        updatedAt: new Date()
      })
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
    return await db
      .select()
      .from(mlTrainingSessions)
      .where(eq(mlTrainingSessions.modelConfigId, modelConfigId));
  }

  async createMlTrainingSession(sessionData: InsertMlTrainingSession): Promise<MlTrainingSession> {
    const [newSession] = await db.insert(mlTrainingSessions).values(sessionData).returning();
    return newSession;
  }

  async updateMlTrainingSessionStatus(
    id: number,
    status: string,
    updates?: Partial<MlTrainingSession>
  ): Promise<MlTrainingSession | undefined> {
    const [updatedSession] = await db
      .update(mlTrainingSessions)
      .set({
        ...updates,
        status,
        updatedAt: new Date()
      })
      .where(eq(mlTrainingSessions.id, id))
      .returning();
    return updatedSession;
  }

  // Composite methods
  async getItemWithDetails(itemId: number): Promise<ItemWithDetails | undefined> {
    const item = await this.getItem(itemId);
    if (!item) return undefined;
    
    const analysis = await this.getAnalysisByItemId(itemId);
    const pricing = await this.getPricingByItemId(itemId);
    const shipping = await this.getShippingByItemId(itemId);
    
    return {
      ...item,
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
    const allItems = await db.select().from(items);
    const itemsWithDetails: ItemWithDetails[] = [];
    
    for (const item of allItems) {
      const details = await this.getItemWithDetails(item.id);
      if (details) {
        itemsWithDetails.push(details);
      }
    }
    
    return itemsWithDetails;
  }

  async getItemsWithDetailsByCustomerId(customerId: number): Promise<ItemWithDetails[]> {
    const customerItems = await this.getItemsByCustomerId(customerId);
    const itemsWithDetails: ItemWithDetails[] = [];
    
    for (const item of customerItems) {
      const details = await this.getItemWithDetails(item.id);
      if (details) {
        itemsWithDetails.push(details);
      }
    }
    
    return itemsWithDetails;
  }

  // Specific method for consignor dashboard
  async getItemsForConsignorDashboard(customerId: number): Promise<any[]> {
    // Import the function from the dedicated module
    const { getConsignorItems } = await import('./getConsignorItems');
    return getConsignorItems(customerId);
  }

  // Dashboard methods
  async getDashboardStats(): Promise<DashboardStats> {
    // Get total counts
    const itemsCount = await db.select({ count: sql<number>`count(*)` }).from(items);
    
    // Use raw SQL for all database queries to avoid table reference issues
    const ordersCountResult = await db.execute(sql`SELECT COUNT(*) FROM orders`);
    const ordersCount = parseInt(ordersCountResult.rows[0].count) || 0;
    
    // Get total sales and payout using the correct database column names
    const totalSalesResult = await db.execute(sql`
      SELECT COALESCE(SUM(total_value), 0) as sum FROM orders
    `);
    const totalSales = parseInt(totalSalesResult.rows[0].sum) || 0;
    
    const totalPayoutResult = await db.execute(sql`
      SELECT COALESCE(SUM(total_payout), 0) as sum FROM orders
    `);
    const totalPayout = parseInt(totalPayoutResult.rows[0].sum) || 0;
    
    // Get status distribution
    const statusRows = await db
      .select({
        status: items.status,
        count: sql<number>`count(*)`
      })
      .from(items)
      .groupBy(items.status);
    
    // Get monthly sales using raw SQL with exact column names
    const monthlySalesResult = await db.execute(sql`
      SELECT 
        to_char(created_at, 'YYYY-MM') as month,
        COALESCE(SUM(total_value), 0) as sales
      FROM orders
      GROUP BY to_char(created_at, 'YYYY-MM')
      ORDER BY to_char(created_at, 'YYYY-MM')
    `);
    
    const monthlySales = monthlySalesResult.rows.map(row => ({
      month: row.month,
      sales: parseInt(row.sales) || 0
    }));
    
    return {
      totalItems: itemsCount[0]?.count || 0,
      totalOrders: ordersCount,
      totalSales: totalSales,
      totalPayout: totalPayout,
      statusDistribution: statusRows.map(row => ({
        status: row.status,
        count: row.count
      })),
      monthlySales: monthlySales
    };
  }

  async getConsignorStats(consignorId: number): Promise<{
    totalItems: number;
    totalSales: number;
    itemsPerStatus: Record<string, number>;
  }> {
    // Get total items for consignor
    const itemsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(items)
      .where(eq(items.customerId, consignorId));
    
    // Get total sales for consignor's items
    const consignorItems = await this.getItemsByCustomerId(consignorId);
    const itemIds = consignorItems.map(item => item.id);
    
    let totalSales = 0;
    if (itemIds.length > 0) {
      // Find all order items containing consignor's items
      const orderItemsWithConsignorItems = await db
        .select()
        .from(orderItems)
        .where(inArray(orderItems.itemId, itemIds));
      
      // Get order IDs
      const orderIds = [...new Set(orderItemsWithConsignorItems.map(oi => oi.orderId))];
      
      // Calculate total sales from these orders
      if (orderIds.length > 0) {
        const salesResult = await db
          .select({ sum: sql<number>`COALESCE(sum(total_value), 0)` })
          .from(orders)
          .where(inArray(orders.id, orderIds));
        
        totalSales = salesResult[0]?.sum || 0;
      }
    }
    
    // Get status distribution
    const statusRows = await db
      .select({
        status: items.status,
        count: sql<number>`count(*)`
      })
      .from(items)
      .where(eq(items.customerId, consignorId))
      .groupBy(items.status);
    
    const itemsPerStatus: Record<string, number> = {};
    statusRows.forEach(row => {
      itemsPerStatus[row.status] = row.count;
    });
    
    return {
      totalItems: itemsCount[0]?.count || 0,
      totalSales,
      itemsPerStatus
    };
  }

  // User methods
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByExternalId(externalId: string, provider: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.externalId, externalId),
          eq(users.provider, provider)
        )
      );
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserExternalId(id: number, externalId: string, provider: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
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
    
    // Find customer linked to this user by matching email
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.email, user.email));
    
    return {
      ...user,
      customer
    };
  }

  async linkUserToCustomer(userId: number, customerId: number): Promise<User | undefined> {
    // Update the user to link it to a customer
    const [updatedUser] = await db
      .update(users)
      .set({ customerId })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async getAdminStats(): Promise<any> {
    // Get total users counts by role
    const totalUsers = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    
    const totalConsignors = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'consignor'));
    
    const totalAdmins = await db
      .select({ count: sql<number>`count(*)` })
      .from(adminUsers);
    
    return {
      totalUsers: totalUsers[0]?.count || 0,
      totalConsignors: totalConsignors[0]?.count || 0,
      totalAdmins: totalAdmins[0]?.count || 0
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
    if (!user || user.role !== 'consignor') return undefined;
    
    // Find customer linked to this user by matching email
    const customer = await this.getCustomerByEmail(user.email);
    if (!customer) {
      // Just return the user without items if no customer record exists
      return {
        user,
        stats: {
          totalItems: 0,
          totalSales: 0,
          itemsPerStatus: {}
        },
        items: []
      };
    }
    
    // Get stats and items
    const stats = await this.getConsignorStats(customer.id);
    const items = await this.getItemsWithDetailsByCustomerId(customer.id);
    
    return {
      user,
      customer,
      stats,
      items
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
    const [adminUser] = await db
      .select()
      .from(adminUsers)
      .where(
        and(
          eq(adminUsers.externalId, externalId),
          eq(adminUsers.provider, provider)
        )
      );
    return adminUser;
  }

  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    const [newAdmin] = await db.insert(adminUsers).values(user).returning();
    return newAdmin;
  }

  async updateAdminUserLastLogin(id: number): Promise<AdminUser | undefined> {
    const [updatedAdmin] = await db
      .update(adminUsers)
      .set({ lastLogin: new Date() })
      .where(eq(adminUsers.id, id))
      .returning();
    return updatedAdmin;
  }

  async updateAdminUserExternalId(id: number, externalId: string, provider: string): Promise<AdminUser | undefined> {
    const [updatedAdmin] = await db
      .update(adminUsers)
      .set({ externalId, provider })
      .where(eq(adminUsers.id, id))
      .returning();
    return updatedAdmin;
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    return await db.select().from(adminUsers);
  }
}

// Export singleton instance
export const storage = new SupabaseStorage();