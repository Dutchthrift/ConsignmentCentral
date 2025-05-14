import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { format, subDays, subMonths, subYears } from "date-fns";
import { UserRole } from "@shared/schema";

const router = Router();

// Middleware to check if user is authenticated and is a consignor
const ensureConsignor = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }
  
  if (!req.user || req.user.role !== UserRole.CONSIGNOR) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Consignor role required.",
    });
  }
  
  next();
};

// Get personalized insights for a consignor
router.get('/consignor/insights', ensureConsignor, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const timeRange = req.query.timeRange as string || 'last30days';
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Get the user with consignor details
    const consignorDetails = await storage.getConsignorDetails(userId);
    
    if (!consignorDetails || !consignorDetails.customer) {
      return res.status(404).json({
        success: false,
        message: 'Consignor details not found'
      });
    }

    // Get all items with details for the consignor
    const items = await storage.getItemsWithDetailsByCustomerId(consignorDetails.customer.id);
    
    if (!items || items.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          topSellingCategories: [],
          salesTrend: [],
          itemStatusDistribution: [],
          performance: {
            averageDaysToSell: 0,
            sellThroughRate: 0,
            totalRevenue: 0,
            averagePricePoint: 0
          },
          recentSales: [],
          recommendedActions: [
            {
              type: 'info',
              message: 'Start consigning items to see personalized insights.'
            }
          ]
        }
      });
    }

    // Process data based on time range
    const cutoffDate = getCutoffDate(timeRange);
    const filteredItems = items.filter(item => {
      if (item.createdAt) {
        const itemDate = new Date(item.createdAt);
        return itemDate >= cutoffDate;
      }
      return true;
    });

    // Calculate category statistics
    const categories = generateCategoryStats(filteredItems);
    
    // Calculate sales trend
    const salesTrend = generateSalesTrend(filteredItems, timeRange);
    
    // Calculate item status distribution
    const statusDistribution = generateStatusDistribution(filteredItems);
    
    // Calculate performance metrics
    const performance = calculatePerformanceMetrics(filteredItems);
    
    // Get recent sales
    const recentSales = getRecentSales(filteredItems);
    
    // Generate personalized recommendations
    const recommendations = generateRecommendations(filteredItems, performance);

    // Return the processed insights data
    res.json({
      success: true,
      data: {
        topSellingCategories: categories,
        salesTrend,
        itemStatusDistribution: statusDistribution,
        performance,
        recentSales,
        recommendedActions: recommendations
      }
    });
  } catch (error) {
    console.error('Error fetching consignor insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve consignor insights',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to get cutoff date based on time range
function getCutoffDate(timeRange: string): Date {
  const now = new Date();
  
  switch (timeRange) {
    case 'last30days':
      return subDays(now, 30);
    case 'last90days':
      return subDays(now, 90);
    case 'lastYear':
      return subMonths(now, 12);
    case 'allTime':
    default:
      return new Date(0); // Beginning of time
  }
}

// Helper function to generate category statistics
function generateCategoryStats(items: any[]) {
  const categoryCount: Record<string, number> = {};
  const soldItems = items.filter(item => item.status === 'sold' || item.status === 'paid');
  
  soldItems.forEach(item => {
    const category = item.productType || 'Uncategorized';
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });
  
  // Colors for different categories
  const categoryColors: Record<string, string> = {
    'Clothing': '#8884d8',
    'Accessories': '#82ca9d',
    'Shoes': '#ffc658',
    'Bags': '#ff8042',
    'Jewelry': '#0088FE',
    'Homeware': '#00C49F',
    'Books': '#FFBB28',
    'Uncategorized': '#FF8042'
  };
  
  return Object.entries(categoryCount)
    .map(([name, value]) => ({
      name,
      value,
      color: categoryColors[name] || '#9c88ff'
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // Return top 5 categories
}

// Helper function to generate sales trend
function generateSalesTrend(items: any[], timeRange: string) {
  const soldItems = items.filter(item => item.status === 'sold' || item.status === 'paid');
  const trend: { date: string; value: number }[] = [];
  
  // Format dates based on time range
  const dateFormat = timeRange === 'lastYear' ? 'MMM yyyy' : 'dd MMM';
  const groupByField = timeRange === 'lastYear' ? 'month' : 'day';
  
  // Group sales by date
  const salesByDate: Record<string, number> = {};
  
  soldItems.forEach(item => {
    if (item.soldDate) {
      const date = new Date(item.soldDate);
      const formattedDate = format(date, dateFormat);
      const price = item.pricing?.sellingPrice || 0;
      
      salesByDate[formattedDate] = (salesByDate[formattedDate] || 0) + price;
    }
  });
  
  // Fill in missing dates with zero values
  const now = new Date();
  let interval: number;
  let numPoints: number;
  
  switch (timeRange) {
    case 'last30days':
      interval = 1;
      numPoints = 30;
      break;
    case 'last90days':
      interval = 3;
      numPoints = 30;
      break;
    case 'lastYear':
      interval = 1;
      numPoints = 12;
      break;
    case 'allTime':
    default:
      interval = 30;
      numPoints = 12;
      break;
  }
  
  for (let i = numPoints - 1; i >= 0; i--) {
    const date = timeRange === 'lastYear' 
      ? subMonths(now, i * interval)
      : subDays(now, i * interval);
    
    const formattedDate = format(date, dateFormat);
    
    trend.push({
      date: formattedDate,
      value: salesByDate[formattedDate] || 0
    });
  }
  
  return trend;
}

// Helper function to generate item status distribution
function generateStatusDistribution(items: any[]) {
  const statusCount: Record<string, number> = {};
  const statusColors: Record<string, string> = {
    'pending': '#ffc658',
    'received': '#FFBB28',
    'analyzing': '#0088FE',
    'pricing': '#00C49F',
    'approved': '#82ca9d',
    'listed': '#8884d8',
    'sold': '#ff8042',
    'paid': '#FF4842',
    'returned': '#666666',
    'rejected': '#999999'
  };
  
  items.forEach(item => {
    const status = item.status || 'unknown';
    statusCount[status] = (statusCount[status] || 0) + 1;
  });
  
  return Object.entries(statusCount)
    .map(([name, value]) => ({
      name: capitalizeFirstLetter(name),
      value,
      color: statusColors[name] || '#9c88ff'
    }))
    .sort((a, b) => b.value - a.value);
}

// Helper function to calculate performance metrics
function calculatePerformanceMetrics(items: any[]) {
  const soldItems = items.filter(item => item.status === 'sold' || item.status === 'paid');
  const totalItems = items.length;
  
  // Calculate average days to sell
  let totalDaysToSell = 0;
  let itemsWithSellData = 0;
  
  soldItems.forEach(item => {
    if (item.createdAt && item.soldDate) {
      const createDate = new Date(item.createdAt);
      const soldDate = new Date(item.soldDate);
      const daysToSell = Math.ceil((soldDate.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysToSell >= 0) {
        totalDaysToSell += daysToSell;
        itemsWithSellData++;
      }
    }
  });
  
  const averageDaysToSell = itemsWithSellData > 0 ? totalDaysToSell / itemsWithSellData : 0;
  
  // Calculate sell-through rate
  const sellThroughRate = totalItems > 0 ? soldItems.length / totalItems : 0;
  
  // Calculate total revenue and average price
  let totalRevenue = 0;
  soldItems.forEach(item => {
    if (item.pricing?.sellingPrice) {
      totalRevenue += item.pricing.sellingPrice;
    }
  });
  
  const averagePricePoint = soldItems.length > 0 ? totalRevenue / soldItems.length : 0;
  
  return {
    averageDaysToSell,
    sellThroughRate,
    totalRevenue,
    averagePricePoint
  };
}

// Helper function to get recent sales
function getRecentSales(items: any[]) {
  return items
    .filter(item => item.status === 'sold' || item.status === 'paid')
    .sort((a, b) => {
      const dateA = a.soldDate ? new Date(a.soldDate).getTime() : 0;
      const dateB = b.soldDate ? new Date(b.soldDate).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 5)
    .map(item => ({
      id: item.id,
      name: item.title || `Item #${item.referenceId || item.id}`,
      soldDate: item.soldDate ? format(new Date(item.soldDate), 'dd MMM yyyy') : 'Unknown',
      price: item.pricing?.sellingPrice || 0,
      category: item.productType || 'Uncategorized'
    }));
}

// Helper function to generate personalized recommendations
function generateRecommendations(items: any[], performance: any) {
  const recommendations: Array<{ type: 'success' | 'warning' | 'info'; message: string }> = [];
  
  // Check if seller has any items
  if (items.length === 0) {
    recommendations.push({
      type: 'info',
      message: 'Start consigning items to see personalized insights and recommendations.'
    });
    return recommendations;
  }
  
  // Check sell-through rate
  if (performance.sellThroughRate < 0.3) {
    recommendations.push({
      type: 'warning',
      message: 'Your sell-through rate is below average. Consider adjusting your pricing strategy or focusing on more in-demand categories.'
    });
  } else if (performance.sellThroughRate > 0.7) {
    recommendations.push({
      type: 'success',
      message: 'Your sell-through rate is excellent! Consider consigning more items to maximize your earnings.'
    });
  }
  
  // Check average days to sell
  if (performance.averageDaysToSell > 30) {
    recommendations.push({
      type: 'info',
      message: 'Your items are taking longer than average to sell. Consider optimizing item descriptions and photos.'
    });
  } else if (performance.averageDaysToSell < 14 && performance.averageDaysToSell > 0) {
    recommendations.push({
      type: 'success',
      message: 'Your items sell quickly! You might be able to increase your prices slightly.'
    });
  }
  
  // Category-specific recommendations
  const categories = items.map(item => item.productType).filter(Boolean);
  const categorySet = new Set(categories);
  const uniqueCategories = Array.from(categorySet);
  
  if (uniqueCategories.length < 3 && items.length > 5) {
    recommendations.push({
      type: 'info',
      message: 'Consider diversifying the types of items you consign to reach more potential buyers.'
    });
  }
  
  // If there are no specific recommendations, add a generic one
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'info',
      message: 'Your consignment performance is on track. Continue to add quality items to increase your earnings.'
    });
  }
  
  return recommendations;
}

// Utility function to capitalize first letter
function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export default router;
