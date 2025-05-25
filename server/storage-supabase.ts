import { supabase } from './supabase-client';
// Import what's needed for our Supabase storage implementation
import { generateReferenceId, generateOrderNumber } from './utils/generators';
import { calculateCommission } from './utils/pricing';

export class SupabaseStorage {
  // User-related methods
  async getUserByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
    
    return data;
  }
  
  async getCustomerByEmail(email: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      console.error('Error getting customer by email:', error);
      return undefined;
    }
    
    return data;
  }
  
  async updateCustomerByEmail(email: string, updates: any) {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('email', email)
      .single();
    
    if (error) {
      console.error('Error updating customer:', error);
      return undefined;
    }
    
    return data;
  }

  // Item-related methods
  async createItem(item: any) {
    // Generate a unique reference ID if not provided
    if (!item.reference_id) {
      item.reference_id = generateReferenceId();
    }
    
    const { data, error } = await supabase
      .from('items')
      .insert(item)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating item:', error);
      throw new Error(`Failed to create item: ${error.message}`);
    }
    
    return data;
  }
  
  async getItemsByCustomerId(customerId: number) {
    const { data, error } = await supabase
      .from('items')
      .select(`
        *,
        order_items!inner (
          order_id
        ),
        orders:order_items!inner(order_id).orders (
          *
        )
      `)
      .eq('customer_id', customerId);
    
    if (error) {
      console.error('Error getting items by customer ID:', error);
      return [];
    }
    
    return data || [];
  }

  // Order-related methods
  async createOrder(orderData: any) {
    // Generate order number if not provided
    if (!orderData.order_number) {
      orderData.order_number = generateOrderNumber();
    }
    
    // Set default status if not provided
    if (!orderData.status) {
      orderData.status = 'awaiting_shipment';
    }
    
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating order:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }
    
    return data;
  }
  
  async getOrdersByCustomerId(customerId: number) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          item_id
        ),
        items:order_items(item_id).items (
          *
        )
      `)
      .eq('customer_id', customerId);
    
    if (error) {
      console.error('Error getting orders by customer ID:', error);
      return [];
    }
    
    return data || [];
  }

  // Order-Item relationship methods
  async createOrderItemRelation(orderItemData: any) {
    const { data, error } = await supabase
      .from('order_items')
      .insert(orderItemData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating order-item relation:', error);
      throw new Error(`Failed to create order-item relation: ${error.message}`);
    }
    
    return data;
  }

  // Pricing and analysis methods
  async createPricingInfo(pricingData: any) {
    const { data, error } = await supabase
      .from('pricing')
      .insert(pricingData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating pricing info:', error);
      return undefined;
    }
    
    return data;
  }
  
  async createAnalysisResult(analysisData: any) {
    const { data, error } = await supabase
      .from('analysis')
      .insert(analysisData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating analysis result:', error);
      return undefined;
    }
    
    return data;
  }

  // Transaction support
  async processNewIntake(userId: number, itemData: any, imageUrl?: string) {
    // Start a transaction manually since Supabase doesn't have built-in transaction support
    // We'll use Supabase's RPC (Remote Procedure Call) feature for this
    try {
      // 1. Find the customer ID associated with the user
      const customer = await this.getCustomerByUserId(userId);
      if (!customer) {
        throw new Error(`No customer found for user ID: ${userId}`);
      }
      
      const customerId = customer.id;
      
      // 2. Create a new order
      const orderData = {
        customer_id: customerId,
        status: 'awaiting_shipment',
        submission_date: new Date(),
        total_value: 5000, // Default estimation value in cents
        total_payout: 3500, // Default payout value in cents
      };
      
      const order = await this.createOrder(orderData);
      
      // 3. Create the item with reference to the customer
      const itemToCreate = {
        title: itemData.title,
        reference_id: generateReferenceId(),
        status: 'pending',
        customer_id: customerId,
        image_url: imageUrl || '',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const item = await this.createItem(itemToCreate);
      
      // 4. Create the order-item relationship
      const orderItemData = {
        order_id: order.id,
        item_id: item.id
      };
      
      await this.createOrderItemRelation(orderItemData);
      
      // 5. Create initial pricing estimation if values provided
      if (itemData.estimatedValue) {
        const commissionData = calculateCommission(itemData.estimatedValue);
        
        const pricingData = {
          item_id: item.id,
          estimated_value: itemData.estimatedValue,
          commission_rate: commissionData.commissionRate,
          commission_amount: commissionData.commissionAmount,
          payout_amount: commissionData.payoutAmount,
          created_at: new Date()
        };
        
        await this.createPricingInfo(pricingData);
      }
      
      return {
        success: true,
        item,
        order,
        message: 'Item successfully added to consignment'
      };
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }
}

// Helper methods for ID generation
function generateOrderId(): string {
  return 'ORD-' + Math.floor(Math.random() * 1000000).toString();
}

// Export a single instance for use throughout the application
export const supabaseStorage = new SupabaseStorage();