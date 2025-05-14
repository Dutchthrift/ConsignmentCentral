import { 
  customers, Customer, InsertCustomer,
  items, Item, InsertItem, 
  analyses, Analysis, InsertAnalysis,
  pricing, Pricing, InsertPricing,
  shipping, Shipping, InsertShipping,
  mlTrainingExamples, MlTrainingExample, InsertMlTrainingExample,
  mlModelConfigs, MlModelConfig, InsertMlModelConfig,
  mlTrainingSessions, MlTrainingSession, InsertMlTrainingSession,
  users, User, InsertUser,
  ItemWithDetails, DashboardStats
} from "@shared/schema";
import { db } from "./db";
import { IStorage } from "./storage";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
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
}