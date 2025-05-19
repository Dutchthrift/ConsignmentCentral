/**
 * In-memory store for authentication fallback when database is unavailable
 * Contains predefined admin and user accounts for testing
 */

const memStore = {
  adminUsers: [
    {
      id: 1,
      email: 'admin@dutchthrift.com',
      password: '$2b$10$kLEiKxF3g/RTZZ9BtZnBZODm8hE8v6i4c2vrYNgpS3JHYnVEgRXTm', // admin123
      name: 'Admin User',
      role: 'admin',
      createdAt: new Date(),
      lastLogin: null
    }
  ],
  users: [
    {
      id: 2,
      email: 'theooenema@hotmail.com',
      password: '$2b$10$kLEiKxF3g/RTZZ9BtZnBZODm8hE8v6i4c2vrYNgpS3JHYnVEgRXTm', // password123
      name: 'Theo Oenema',
      role: 'consignor',
      createdAt: new Date(),
      lastLogin: null
    }
  ],
  customers: [
    {
      id: 1,
      email: 'theooenema@hotmail.com',
      name: 'Theo Oenema',
      phone: '+31612345678',
      address: 'Prinsesseweg 79',
      city: 'Groningen',
      state: 'Groningen',
      postalCode: '9717KB',
      country: 'Netherlands',
      createdAt: new Date()
    }
  ],
  
  // Admin user methods
  getAdminUserByEmail(email) {
    return this.adminUsers.find(user => user.email === email);
  },
  
  updateAdminUserLastLogin(id) {
    const user = this.adminUsers.find(user => user.id === id);
    if (user) {
      user.lastLogin = new Date();
    }
    return user;
  },
  
  // Regular user methods
  getUserByEmail(email) {
    return this.users.find(user => user.email === email);
  },
  
  updateUserLastLogin(id) {
    const user = this.users.find(user => user.id === id);
    if (user) {
      user.lastLogin = new Date();
    }
    return user;
  },
  
  // Customer methods
  getCustomerByEmail(email) {
    return this.customers.find(customer => customer.email === email);
  }
};

export default memStore;