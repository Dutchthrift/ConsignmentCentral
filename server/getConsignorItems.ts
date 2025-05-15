import { db } from './db';
import { items, pricing, analyses, shipping } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Direct SQL query to get all items for a consignor with related details
export async function getConsignorItems(customerId: number) {
  try {
    // Get all items for this customer
    const customerItems = await db.select().from(items).where(eq(items.customerId, customerId));
    
    if (!customerItems || customerItems.length === 0) {
      return {
        success: true,
        data: []
      };
    }
    
    // Get all related data in bulk to minimize database queries
    const itemIds = customerItems.map(item => item.id);
    
    // Get pricing data for all items
    const pricingData = await db.select().from(pricing)
      .where(itemIds.length > 0
        ? pricing.itemId.in(itemIds)
        : eq(pricing.itemId, -1)); // If no items, use an impossible condition
        
    // Get analysis data for all items
    const analysisData = await db.select().from(analyses)
      .where(itemIds.length > 0
        ? analyses.itemId.in(itemIds)
        : eq(analyses.itemId, -1));
        
    // Get shipping data for all items
    const shippingData = await db.select().from(shipping)
      .where(itemIds.length > 0
        ? shipping.itemId.in(itemIds)
        : eq(shipping.itemId, -1));
    
    // Create lookup maps for quick access
    const pricingMap = pricingData.reduce((map, price) => {
      map[price.itemId] = price;
      return map;
    }, {} as Record<number, typeof pricing.$inferSelect>);
    
    const analysisMap = analysisData.reduce((map, analysis) => {
      map[analysis.itemId] = analysis;
      return map;
    }, {} as Record<number, typeof analyses.$inferSelect>);
    
    const shippingMap = shippingData.reduce((map, ship) => {
      map[ship.itemId] = ship;
      return map;
    }, {} as Record<number, typeof shipping.$inferSelect>);
    
    // Format the items with all their relations
    const formattedItems = customerItems.map(item => {
      const itemPricing = pricingMap[item.id];
      const itemAnalysis = analysisMap[item.id];
      const itemShipping = shippingMap[item.id];
      
      return {
        id: item.id,
        referenceId: item.referenceId,
        title: item.title,
        description: item.description,
        category: item.category,
        status: item.status,
        imageUrl: item.imageUrl,
        customerId: item.customerId,
        createdAt: item.createdAt ? item.createdAt.toISOString() : null,
        updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
        
        // Pricing details
        suggestedListingPrice: itemPricing?.suggestedListingPrice,
        commissionRate: itemPricing?.commissionRate,
        suggestedPayout: itemPricing?.suggestedPayout,
        finalSalePrice: itemPricing?.finalSalePrice,
        finalPayout: itemPricing?.finalPayout,
        payoutType: itemPricing?.payoutType,
        
        // Analysis summary if available
        analysis: itemAnalysis ? {
          id: itemAnalysis.id,
          category: itemAnalysis.category,
          brand: itemAnalysis.brand,
          condition: itemAnalysis.condition,
          productType: itemAnalysis.productType,
          model: itemAnalysis.model,
          accessories: itemAnalysis.accessories,
          additionalNotes: itemAnalysis.additionalNotes,
          createdAt: itemAnalysis.createdAt ? itemAnalysis.createdAt.toISOString() : null
        } : null,
        
        // Shipping info if available
        shipping: itemShipping ? {
          id: itemShipping.id,
          trackingNumber: itemShipping.trackingNumber,
          carrier: itemShipping.carrier,
          labelUrl: itemShipping.labelUrl,
          createdAt: itemShipping.createdAt ? itemShipping.createdAt.toISOString() : null
        } : null
      };
    });
    
    return {
      success: true,
      data: formattedItems
    };
  } catch (error) {
    console.error("Error getting consignor items:", error);
    return {
      success: false,
      message: "Error retrieving consignor items",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}