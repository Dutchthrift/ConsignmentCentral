/**
 * Storage interface and implementation
 */
import { 
  Customer, InsertCustomer,
  Item, InsertItem, 
  Order, InsertOrder,
  User, InsertUser,
  AdminUser, InsertAdminUser
} from "@shared/schema";
import session from 'express-session';
import createMemoryStore from 'memorystore';

const MemoryStore = createMemoryStore(session);

// Interface for storage operations
export interface IStorage {
  // Session store
  sessionStore: session.Store;

  // User management
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(userData: InsertUser): Promise<User>;
  updateUserLastLogin(id: number): Promise<User | undefined>;

  // Admin user management
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  getAdminUserById(id: number): Promise<AdminUser | undefined>;
  getAllAdminUsers(): Promise<AdminUser[]>;

  // Customer management
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  getCustomerByUserId(userId: number): Promise<Customer | undefined>;
  createCustomer(data: InsertCustomer): Promise<Customer>;

  // Additional methods from existing interface
  getClient(): Promise<any>;
  updateItemImage(id: number, path: string): Promise<void>;
  getOrderByCustomerIdAndStatus(customerId: number, status: string): Promise<Order | null>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: User[] = [];
  private customers: Customer[] = [];
  private items: Item[] = [];
  private orders: Order[] = [];
  private adminUsers: AdminUser[] = [];
  
  sessionStore: session.Store;

  constructor() {
    console.log('Using simplified in-memory storage');
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Create a test admin
    this.adminUsers.push({
      id: 1,
      email: 'admin@dutchthrift.com',
      password: '$2b$10$zMRXQnHlyEpb1vt.vNMsu.cMR7XEj/67Pvw.OuoTZ.GKx3WiYXJj2', // admin123
      name: 'Admin User',
      role: 'admin',
      created_at: new Date(),
      provider: 'local',
      last_login: null,
      external_id: null,
      profile_image_url: null
    });

    // Create a test consignor user
    this.users.push({
      id: 1, 
      email: 'theooenema@hotmail.com',
      password: '$2b$10$zMRXQnHlyEpb1vt.vNMsu.cMR7XEj/67Pvw.OuoTZ.GKx3WiYXJj2', // password123
      name: 'Theo Oenema',
      role: 'consignor',
      created_at: new Date(),
      provider: 'local',
      last_login: null,
      external_id: null,
      profile_image_url: null
    });

    // Create customer for the consignor
    this.customers.push({
      id: 1,
      email: 'theooenema@hotmail.com',
      first_name: 'Theo',
      last_name: 'Oenema',
      user_id: 1,
      phone: null,
      state: null,
      postal_code: null,
      address: null,
      city: null,
      country: null,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Admin User Methods
  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    return this.adminUsers.find(user => user.email === email);
  }

  async getAdminUserById(id: number): Promise<AdminUser | undefined> {
    return this.adminUsers.find(user => user.id === id);
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    return this.adminUsers;
  }

  // User Methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.users.find(user => user.email === email);
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    // Generate ID
    const newId = this.users.length > 0 
      ? Math.max(...this.users.map(u => u.id)) + 1 
      : 1;
    
    const newUser: User = {
      id: newId,
      email: userData.email,
      password: userData.password || null,
      name: userData.name,
      role: userData.role || 'consignor',
      created_at: new Date(),
      provider: userData.provider || 'local',
      last_login: null,
      external_id: null,
      profile_image_url: null
    };
    
    this.users.push(newUser);
    return newUser;
  }

  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const user = this.users.find(user => user.id === id);
    if (user) {
      user.last_login = new Date();
    }
    return user;
  }

  // Customer Methods
  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    return this.customers.find(customer => customer.email === email);
  }

  async getCustomerByUserId(userId: number): Promise<Customer | undefined> {
    return this.customers.find(customer => customer.user_id === userId);
  }

  async createCustomer(data: InsertCustomer): Promise<Customer> {
    // Generate ID
    const newId = this.customers.length > 0 
      ? Math.max(...this.customers.map(c => c.id)) + 1 
      : 1;
    
    const newCustomer: Customer = {
      id: newId,
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      user_id: data.userId,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      postal_code: data.postalCode || null,
      country: data.country || null,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.customers.push(newCustomer);
    return newCustomer;
  }

  // Stub implementations to make the interface happy
  async getClient() {
    return null;
  }

  async updateItemImage() {
    return null;
  }

  async getOrderByCustomerIdAndStatus() {
    return null;
  }
}

// Export the simplified storage implementation
export const storage = new MemStorage();