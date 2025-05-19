import bcrypt from 'bcrypt';
import memStore from '../auth-mem-store.js';

// This service provides failover authentication when the database is unavailable

export async function verifyAdminCredentials(email, password) {
  console.log('Using failover authentication for admin login');
  try {
    // Get the admin user from the in-memory store
    const user = await memStore.getAdminUserByEmail(email);
    
    if (!user) {
      console.log('Admin user not found in failover authentication store');
      return null;
    }
    
    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      console.log('Invalid password in failover authentication');
      return null;
    }
    
    // Update last login
    await memStore.updateAdminUserLastLogin(user.id);
    
    return user;
  } catch (error) {
    console.error('Error in failover admin authentication:', error);
    return null;
  }
}

export async function verifyUserCredentials(email, password) {
  console.log('Using failover authentication for user login');
  try {
    // Get the user from the in-memory store
    const user = await memStore.getUserByEmail(email);
    
    if (!user) {
      console.log('User not found in failover authentication store');
      return null;
    }
    
    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      console.log('Invalid password in failover authentication');
      return null;
    }
    
    // Update last login
    await memStore.updateUserLastLogin(user.id);
    
    // Get associated customer if this is a consignor
    if (user.role === 'consignor') {
      const customer = await memStore.getCustomerByEmail(user.email);
      
      if (customer) {
        return {
          ...user,
          customerId: customer.id
        };
      }
    }
    
    return user;
  } catch (error) {
    console.error('Error in failover user authentication:', error);
    return null;
  }
}

export async function getUserById(id) {
  try {
    return await memStore.getUserById(id);
  } catch (error) {
    console.error('Error in failover getting user by ID:', error);
    return null;
  }
}

export async function getAllUsers() {
  try {
    return await memStore.getAllUsers();
  } catch (error) {
    console.error('Error in failover getting all users:', error);
    return [];
  }
}

export async function getAllAdminUsers() {
  try {
    return await memStore.getAllAdminUsers();
  } catch (error) {
    console.error('Error in failover getting all admin users:', error);
    return [];
  }
}