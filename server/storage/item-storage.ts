import { db } from '../db';
import { items, pricing } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Storage methods for handling item data operations
 */
export class ItemStorage {
  /**
   * Update the status of an item
   */
  async updateItemStatus(itemId: number, status: string) {
    try {
      const [updatedItem] = await db
        .update(items)
        .set({ status, updatedAt: new Date() })
        .where(eq(items.id, itemId))
        .returning();
      
      return updatedItem;
    } catch (error) {
      console.error('Error updating item status:', error);
      throw new Error('Failed to update item status');
    }
  }

  /**
   * Get pricing data for an item
   */
  async getPricingByItemId(itemId: number) {
    try {
      const [pricingData] = await db
        .select()
        .from(pricing)
        .where(eq(pricing.itemId, itemId));
      
      return pricingData;
    } catch (error) {
      console.error('Error getting pricing data:', error);
      throw new Error('Failed to get pricing data');
    }
  }

  /**
   * Update pricing data for an item
   */
  async updatePricing(itemId: number, pricingData: any) {
    try {
      // First check if pricing data exists
      const existingPricing = await this.getPricingByItemId(itemId);
      
      if (existingPricing) {
        // Update existing pricing
        const [updatedPricing] = await db
          .update(pricing)
          .set({ ...pricingData, updatedAt: new Date() })
          .where(eq(pricing.itemId, itemId))
          .returning();
        
        return updatedPricing;
      } else {
        // Create new pricing entry
        const [newPricing] = await db
          .insert(pricing)
          .values({ ...pricingData, itemId, createdAt: new Date() })
          .returning();
        
        return newPricing;
      }
    } catch (error) {
      console.error('Error updating pricing data:', error);
      throw new Error('Failed to update pricing data');
    }
  }
}