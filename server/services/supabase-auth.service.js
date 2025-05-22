import bcrypt from 'bcryptjs';
import supabase from '../../shared/supabase.js';

class SupabaseAuthService {
  /**
   * Admin login - checks against users table
   */
  async loginAdmin(email, password) {
    console.log(`Attempting admin login for: ${email}`);
    
    // Find the admin in the users table
    const { data: admin, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', 'admin')
      .single();
    
    if (error || !admin) {
      console.log(`Admin not found: ${email}`);
      throw new Error('Invalid email or password');
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, admin.password_hash);
    if (!passwordValid) {
      console.log(`Invalid password for admin: ${email}`);
      throw new Error('Invalid email or password');
    }
    
    console.log(`Admin login successful: ${email}`);
    
    // Return admin info (exclude password hash)
    const { password_hash, ...adminData } = admin;
    return {
      ...adminData,
      userType: 'admin'
    };
  }
  
  /**
   * Consignor login - checks against customers table
   */
  async loginConsignor(email, password) {
    console.log(`Attempting consignor login for: ${email}`);
    
    // Find the consignor in the customers table
    const { data: consignor, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !consignor) {
      console.log(`Consignor not found: ${email}`);
      throw new Error('Invalid email or password');
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, consignor.password_hash);
    if (!passwordValid) {
      console.log(`Invalid password for consignor: ${email}`);
      throw new Error('Invalid email or password');
    }
    
    console.log(`Consignor login successful: ${email}`);
    
    // Return consignor info (exclude password hash)
    const { password_hash, ...consignorData } = consignor;
    return {
      ...consignorData,
      userType: 'consignor'
    };
  }
  
  /**
   * Register a new consignor
   */
  async registerConsignor(consignorData) {
    const { email, password, name } = consignorData;
    
    // Check if consignor already exists
    const { data: existingConsignor } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existingConsignor) {
      throw new Error('Email already in use');
    }
    
    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    
    // Create consignor
    const { data: newConsignor, error } = await supabase
      .from('customers')
      .insert({
        email,
        password_hash,
        name
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating consignor:', error);
      throw new Error('Failed to register consignor');
    }
    
    // Return new consignor data (exclude password hash)
    const { password_hash: _, ...consignorData } = newConsignor;
    return {
      ...consignorData,
      userType: 'consignor'
    };
  }
  
  /**
   * Get admin by ID
   */
  async getAdminById(id) {
    const { data: admin, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !admin) {
      return null;
    }
    
    // Exclude password hash
    const { password_hash, ...adminData } = admin;
    return {
      ...adminData,
      userType: 'admin'
    };
  }
  
  /**
   * Get consignor by ID
   */
  async getConsignorById(id) {
    const { data: consignor, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !consignor) {
      return null;
    }
    
    // Exclude password hash
    const { password_hash, ...consignorData } = consignor;
    return {
      ...consignorData,
      userType: 'consignor'
    };
  }
}

export default new SupabaseAuthService();