import { db } from './db';
import { items, pricing } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Standalone function to get consignor dashboard data
export async function getConsignorDashboard(customerId: number) {
  try {
    // Get all items for this customer
    const customerItems = await db.select().from(items).where(eq(items.customerId, customerId));
    
    // Get pricing info for these items
    const itemIds = customerItems.map(item => item.id);
    const pricingData = itemIds.length > 0 
      ? await db.select().from(pricing).where(eq(pricing.itemId, itemIds[0])) 
      : [];
    
    // Create a lookup map for pricing
    const pricingMap = pricingData.reduce((map, price) => {
      map[price.itemId] = price;
      return map;
    }, {} as Record<number, typeof pricing.$inferSelect>);
    
    // Format the data for the dashboard
    const formattedItems = customerItems.map(item => {
      const itemPricing = pricingMap[item.id] || { 
        suggestedListingPrice: null, 
        commissionRate: null,
        finalPayout: null,
        payoutType: null,
        finalSalePrice: null
      };
      
      return {
        id: item.id,
        referenceId: item.referenceId,
        title: item.title,
        imageUrl: item.imageUrl,
        status: item.status,
        createdAt: item.createdAt || new Date(),
        estimatedPrice: itemPricing.suggestedListingPrice ? itemPricing.suggestedListingPrice / 100 : undefined,
        commissionRate: itemPricing.commissionRate,
        payoutAmount: itemPricing.finalPayout ? itemPricing.finalPayout / 100 : undefined,
        payoutType: itemPricing.payoutType || "cash",
        finalSalePrice: itemPricing.finalSalePrice ? itemPricing.finalSalePrice / 100 : undefined,
      };
    });
    
    // Calculate stats for the dashboard
    const itemStatusCount: Record<string, number> = {};
    let totalSales = 0;
    let totalPayout = 0;
    
    formattedItems.forEach(item => {
      // Count items by status
      itemStatusCount[item.status] = (itemStatusCount[item.status] || 0) + 1;
      
      // Calculate sales and payouts
      if (item.status === 'sold' && item.finalSalePrice) {
        totalSales += item.finalSalePrice;
        if (item.payoutAmount) {
          totalPayout += item.payoutAmount;
        }
      }
    });
    
    // Status distribution
    const statusDistribution = Object.entries(itemStatusCount).map(([status, count]) => ({
      status,
      count
    }));
    
    // Calculate value of items in each stage
    const pendingValue = formattedItems
      .filter(item => item.status === 'pending' && item.estimatedPrice)
      .reduce((total, item) => total + (item.estimatedPrice || 0), 0);
    
    const approvedValue = formattedItems
      .filter(item => item.status === 'approved' && item.estimatedPrice)
      .reduce((total, item) => total + (item.estimatedPrice || 0), 0);
    
    const listedValue = formattedItems
      .filter(item => item.status === 'listed' && item.estimatedPrice)
      .reduce((total, item) => total + (item.estimatedPrice || 0), 0);
    
    const soldValue = formattedItems
      .filter(item => item.status === 'sold' && item.finalSalePrice)
      .reduce((total, item) => total + (item.finalSalePrice || 0), 0);
    
    return {
      success: true,
      data: {
        items: formattedItems,
        stats: {
          itemsCount: formattedItems.length,
          pendingCount: itemStatusCount['pending'] || 0,
          approvedCount: itemStatusCount['approved'] || 0,
          listedCount: itemStatusCount['listed'] || 0,
          soldCount: itemStatusCount['sold'] || 0,
          rejectedCount: itemStatusCount['rejected'] || 0,
          totalSales,
          totalPayout,
          pendingValue,
          approvedValue,
          listedValue,
          soldValue,
          statusDistribution
        }
      }
    };
  } catch (error) {
    console.error("Error getting consignor dashboard data:", error);
    return {
      success: false,
      message: "Error retrieving consignor dashboard data",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}