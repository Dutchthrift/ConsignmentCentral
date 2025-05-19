// In-memory authentication store for development
// This provides reliable authentication when the database connection is unavailable

// Demo admin user: admin@dutchthrift.com / admin123 (hashed)
const adminUsers = [
  {
    id: 1,
    email: 'admin@dutchthrift.com',
    password: '$2b$10$YgHwA5SbpGxcfCo9YVBvNOF91aQtZK4Xv4/gLWe9M3U/ZkXyV/h4S', // admin123
    name: 'Admin User',
    role: 'admin',
    createdAt: new Date(),
    provider: 'local',
    lastLogin: null
  }
];

// Demo consignor user: theooenema@hotmail.com / password123 (hashed)
const users = [
  {
    id: 1,
    email: 'theooenema@hotmail.com',
    password: '$2b$10$Aq35iBR/rPhoSPIvGxdSFOY2oBYFYgWjg3QX5q6ZuZWFZOi8PdM/K', // password123
    name: 'Theo Oenema',
    role: 'consignor',
    createdAt: new Date(),
    provider: 'local',
    lastLogin: null
  }
];

// Demo customer linked to consignor user
const customers = [
  {
    id: 1,
    email: 'theooenema@hotmail.com',
    firstName: 'Theo',
    lastName: 'Oenema',
    phone: '+31612345678',
    address: 'Prinsesseweg 79',
    city: 'Groningen',
    state: 'Groningen',
    postalCode: '9713 LC',
    country: 'Netherlands',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Authentication functions
module.exports = {
  // Admin user methods
  getAdminUserByEmail: async (email) => {
    return adminUsers.find(user => user.email.toLowerCase() === email.toLowerCase());
  },
  
  updateAdminUserLastLogin: async (id) => {
    const user = adminUsers.find(user => user.id === id);
    if (user) {
      user.lastLogin = new Date();
      return user;
    }
    return null;
  },
  
  // Regular user methods
  getUserByEmail: async (email) => {
    return users.find(user => user.email.toLowerCase() === email.toLowerCase());
  },
  
  getUserById: async (id) => {
    return users.find(user => user.id === id);
  },
  
  updateUserLastLogin: async (id) => {
    const user = users.find(user => user.id === id);
    if (user) {
      user.lastLogin = new Date();
      return user;
    }
    return null;
  },
  
  // Customer methods
  getCustomerByEmail: async (email) => {
    return customers.find(customer => customer.email.toLowerCase() === email.toLowerCase());
  },
  
  getAllUsers: async () => {
    return users;
  },
  
  getAllAdminUsers: async () => {
    return adminUsers;
  }
};