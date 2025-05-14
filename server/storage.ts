import { 
  Customer, InsertCustomer, 
  Item, InsertItem, 
  Analysis, InsertAnalysis, 
  Pricing, InsertPricing, 
  Shipping, InsertShipping,
  ItemWithDetails,
  DashboardStats
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // Customer methods
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  
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
  
  // Composite methods
  getItemWithDetails(itemId: number): Promise<ItemWithDetails | undefined>;
  getItemWithDetailsByReferenceId(referenceId: string): Promise<ItemWithDetails | undefined>;
  getAllItemsWithDetails(): Promise<ItemWithDetails[]>;
  getItemsWithDetailsByCustomerId(customerId: number): Promise<ItemWithDetails[]>;
  
  // Dashboard methods
  getDashboardStats(): Promise<DashboardStats>;
}

// Memory Storage implementation
export class MemStorage implements IStorage {
  private customers: Map<number, Customer>;
  private items: Map<number, Item>;
  private analyses: Map<number, Analysis>;
  private pricing: Map<number, Pricing>;
  private shipping: Map<number, Shipping>;
  
  private customerIdCounter: number;
  private itemIdCounter: number;
  private analysisIdCounter: number;
  private pricingIdCounter: number;
  private shippingIdCounter: number;
  
  constructor() {
    this.customers = new Map();
    this.items = new Map();
    this.analyses = new Map();
    this.pricing = new Map();
    this.shipping = new Map();
    
    this.customerIdCounter = 1;
    this.itemIdCounter = 1;
    this.analysisIdCounter = 1;
    this.pricingIdCounter = 1;
    this.shippingIdCounter = 1;
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
    
    return {
      totalIntakes: allItems.length,
      pendingAnalysis: allItems.filter(item => item.status === 'pending').length,
      activeListings: allItems.filter(item => item.status === 'listed').length,
      soldItems: allItems.filter(item => item.status === 'sold' || item.status === 'paid').length
    };
  }
}

// Export the storage instance
export const storage = new MemStorage();
