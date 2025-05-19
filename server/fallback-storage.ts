import { IStorage } from './storage';
import { OrderSummary } from '@shared/schema';

/**
 * This class provides a fallback storage implementation to use 
 * when the database connection is unavailable
 */
export class FallbackStorage implements IStorage {
  // Store session data in memory when database is offline
  sessionStore: any;
  
  constructor() {
    this.sessionStore = {
      get: (sid: string, callback: (err: any, session?: any) => void) => {
        callback(null, null);
      },
      set: (sid: string, session: any, callback: (err: any) => void) => {
        callback(null);
      },
      destroy: (sid: string, callback: (err: any) => void) => {
        callback(null);
      }
    };
  }

  // Implement basic order-related methods with fallback data
  async getOrderSummaries(): Promise<OrderSummary[]> {
    // Return empty array for order summaries when database is unavailable
    return [];
  }

  async getOrderWithDetails(orderId: number): Promise<any> {
    return null;
  }

  async getOrderWithDetailsByNumber(orderNumber: string): Promise<any> {
    return null;
  }

  // Implement fallbacks for other required methods
  // These are minimal implementations that prevent the app from crashing
  
  async getUser(id: number): Promise<any> {
    return null;
  }

  async getUserByEmail(email: string): Promise<any> {
    return null;
  }

  async getUserByExternalId(externalId: string, provider: string): Promise<any> {
    return null;
  }

  async createUser(user: any): Promise<any> {
    throw new Error('Database unavailable. Cannot create user.');
  }
  
  // Fallback implementation of admin methods
  async getAdminUserByEmail(email: string): Promise<any> {
    return null;
  }

  // Minimal implementations to avoid errors
  async getCustomer(id: number): Promise<any> {
    return null;
  }

  async getCustomerByEmail(email: string): Promise<any> {
    return null;
  }

  async createCustomer(customer: any): Promise<any> {
    throw new Error('Database unavailable. Cannot create customer.');
  }

  async getAllCustomers(): Promise<any[]> {
    return [];
  }

  async updateCustomerByEmail(email: string, updates: any): Promise<any> {
    return null;
  }

  async getItem(id: number): Promise<any> {
    return null;
  }

  async getItemByReferenceId(referenceId: string): Promise<any> {
    return null;
  }

  async getItemsByCustomerId(customerId: number): Promise<any[]> {
    return [];
  }
  
  async getItemsForConsignorDashboard(customerId: number): Promise<any[]> {
    return [];
  }

  // Basic implementation to avoid app crashes
  async searchOrders(query: string): Promise<OrderSummary[]> {
    return [];
  }
}