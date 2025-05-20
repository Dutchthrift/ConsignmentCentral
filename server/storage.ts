/**
 * Simple in-memory storage implementation
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

// Very simple in-memory storage
export class MemStorage {
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
      createdAt: new Date(),
      provider: 'local',
      lastLogin: null,
      externalId: null,
      profileImageUrl: null
    });

    // Create a test consignor user
    this.users.push({
      id: 1, 
      email: 'theooenema@hotmail.com',
      password: '$2b$10$zMRXQnHlyEpb1vt.vNMsu.cMR7XEj/67Pvw.OuoTZ.GKx3WiYXJj2', // password123
      name: 'Theo Oenema',
      role: 'consignor',
      createdAt: new Date(),
      provider: 'local',
      lastLogin: null,
      externalId: null,
      profileImageUrl: null
    });

    // Create customer for the consignor
    this.customers.push({
      id: 1,
      email: 'theooenema@hotmail.com',
      name: 'Theo Oenema',
      role: 'consignor',
      phone: null,
      state: null,
      postal_code: null,
      address: null,
      city: null,
      country: null,
      created_at: new Date(),
      password: '$2b$10$zMRXQnHlyEpb1vt.vNMsu.cMR7XEj/67Pvw.OuoTZ.GKx3WiYXJj2'
    });
  }

  // Only the most essential methods to make the login work
  async getAllAdminUsers(): Promise<AdminUser[]> {
    return this.adminUsers;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Check admin users first
    const adminUser = this.adminUsers.find(user => user.email === email);
    if (adminUser) {
      return {
        id: adminUser.id,
        email: adminUser.email,
        password: adminUser.password,
        name: adminUser.name,
        role: adminUser.role,
        createdAt: adminUser.createdAt,
        provider: adminUser.provider,
        lastLogin: adminUser.lastLogin,
        externalId: adminUser.externalId,
        profileImageUrl: adminUser.profileImageUrl
      };
    }
    
    // Then check regular users
    return this.users.find(user => user.email === email);
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
      createdAt: new Date(),
      provider: userData.provider || 'local',
      lastLogin: null,
      externalId: null,
      profileImageUrl: null
    };
    
    this.users.push(newUser);
    
    // If this is a consignor, create a customer for them
    if (newUser.role === 'consignor') {
      this.createCustomer({
        userId: newId,
        email: newUser.email,
        firstName: newUser.name.split(' ')[0] || '',
        lastName: newUser.name.split(' ').slice(1).join(' ') || '',
        phone: '',
        address: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        companyName: '',
        vatNumber: '',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    return newUser;
  }

  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const user = this.users.find(user => user.id === id);
    if (user) {
      user.lastLogin = new Date();
    }
    return user;
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