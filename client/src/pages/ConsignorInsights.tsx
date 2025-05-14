import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import ConsignorLayout from "@/components/ConsignorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from "recharts";
import { 
  CircleDollarSign, 
  ShoppingBag, 
  TrendingUp, 
  Clock,
  AlertCircle,
  CheckCircle2,
  InfoIcon
} from "lucide-react";

// Define types for the insights data
interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface SalesTrendData {
  date: string;
  value: number;
}

interface PerformanceMetrics {
  averageDaysToSell: number;
  sellThroughRate: number;
  totalRevenue: number;
  averagePricePoint: number;
}

interface RecentSale {
  id: number;
  name: string;
  soldDate: string;
  price: number;
  category: string;
}

interface RecommendedAction {
  type: 'success' | 'warning' | 'info';
  message: string;
}

interface InsightsData {
  topSellingCategories: CategoryData[];
  salesTrend: SalesTrendData[];
  itemStatusDistribution: CategoryData[];
  performance: PerformanceMetrics;
  recentSales: RecentSale[];
  recommendedActions: RecommendedAction[];
}

export default function ConsignorInsights() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<string>("last30days");
  
  const { data, isLoading, error } = useQuery<{ success: boolean; data: InsightsData }>({
    queryKey: ['/api/insights/consignor/insights', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/insights/consignor/insights?timeRange=${timeRange}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to fetch insights");
      }
      return response.json();
    }
  });
  
  // Handle loading state
  if (isLoading) {
    return (
      <ConsignorLayout>
        <div className="flex flex-col gap-4 py-4">
          <h1 className="text-3xl font-bold">Seller Insights</h1>
          <p className="text-muted-foreground">Loading your personalized insights...</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="bg-gray-100 h-20"></CardHeader>
                <CardContent className="h-28 pt-4">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-8 bg-gray-200 rounded mt-2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ConsignorLayout>
    );
  }
  
  // Handle error state
  if (error || !data || !data.success) {
    return (
      <ConsignorLayout>
        <div className="flex flex-col gap-4 py-4">
          <h1 className="text-3xl font-bold">Seller Insights</h1>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error 
                ? error.message 
                : "Failed to load insights. Please try again later."}
            </AlertDescription>
          </Alert>
        </div>
      </ConsignorLayout>
    );
  }
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };
  
  // Format percentage
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };
  
  const insights = data.data;
  
  // Get alert icon based on type
  const getAlertIcon = (type: string) => {
    switch(type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'info':
      default:
        return <InfoIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <ConsignorLayout>
      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold">Seller Insights</h1>
            <p className="text-muted-foreground">View personalized insights and analytics for your consigned items</p>
          </div>
          <Select
            value={timeRange}
            onValueChange={(value) => setTimeRange(value)}
          >
            <SelectTrigger className="w-[180px] mt-2 md:mt-0">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last30days">Last 30 Days</SelectItem>
              <SelectItem value="last90days">Last 90 Days</SelectItem>
              <SelectItem value="lastYear">Last Year</SelectItem>
              <SelectItem value="allTime">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(insights.performance.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                From your sold items
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Price</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(insights.performance.averagePricePoint)}
              </div>
              <p className="text-xs text-muted-foreground">
                Per sold item
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sell-Through Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPercentage(insights.performance.sellThroughRate)}
              </div>
              <p className="text-xs text-muted-foreground">
                Of your listed items
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg. Days to Sell</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(insights.performance.averageDaysToSell)}
              </div>
              <p className="text-xs text-muted-foreground">
                From listing to sale
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Charts and Details */}
        <Tabs defaultValue="overview" className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sales">Sales Trend</TabsTrigger>
            <TabsTrigger value="status">Status Distribution</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Sales Trend</CardTitle>
                  <CardDescription>Your sales performance over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.salesTrend.length > 0 ? (
                    <div style={{ width: '100%', height: 300 }}>
                      <ResponsiveContainer>
                        <AreaChart data={insights.salesTrend} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis 
                            tickFormatter={(value) => `€${value}`}
                            width={70}
                          />
                          <Tooltip 
                            formatter={(value) => [`€${value}`, 'Sales']} 
                            labelFormatter={(label) => `Date: ${label}`}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#8884d8"
                            fill="url(#colorGradient)" 
                            activeDot={{ r: 6 }}
                          />
                          <defs>
                            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 h-[300px]">
                      <p className="text-muted-foreground">No sales data available yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                  <CardDescription>Personalized suggestions to improve your sales</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {insights.recommendedActions.map((action, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 rounded-md bg-slate-50">
                        {getAlertIcon(action.type)}
                        <div>
                          <p className="text-sm">{action.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Recent Sales */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Sales</CardTitle>
                  <CardDescription>Your most recently sold items</CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.recentSales.length > 0 ? (
                    <div className="space-y-4">
                      {insights.recentSales.map((sale) => (
                        <div key={sale.id} className="flex items-center justify-between border-b pb-2">
                          <div>
                            <p className="font-medium">{sale.name}</p>
                            <p className="text-sm text-muted-foreground">{sale.category} • {sale.soldDate}</p>
                          </div>
                          <div className="font-medium">{formatCurrency(sale.price)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground py-2">No recent sales.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Sales Trend Tab */}
          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle>Sales Trend Analysis</CardTitle>
                <CardDescription>Detailed view of your sales over time</CardDescription>
              </CardHeader>
              <CardContent>
                {insights.salesTrend.length > 0 ? (
                  <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                      <LineChart data={insights.salesTrend} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis 
                          tickFormatter={(value) => `€${value}`}
                          width={70}
                        />
                        <Tooltip 
                          formatter={(value) => [`€${value}`, 'Sales']} 
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#8884d8"
                          strokeWidth={2}
                          activeDot={{ r: 8 }}
                          name="Sales Amount"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 h-[400px]">
                    <p className="text-muted-foreground">No sales data available yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Status Distribution Tab */}
          <TabsContent value="status">
            <Card>
              <CardHeader>
                <CardTitle>Item Status Distribution</CardTitle>
                <CardDescription>Breakdown of your items by current status</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col lg:flex-row gap-6">
                {insights.itemStatusDistribution.length > 0 ? (
                  <>
                    <div style={{ width: '100%', height: 300, maxWidth: '500px' }} className="mx-auto">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={insights.itemStatusDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {insights.itemStatusDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value, name) => [`${value} items`, name]} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium mb-2">Status Details</h3>
                      <div className="space-y-2">
                        {insights.itemStatusDistribution.map((status, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }}></div>
                              <span>{status.name}</span>
                            </div>
                            <span className="font-medium">{status.value} items</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 h-[300px] w-full">
                    <p className="text-muted-foreground">No items to display.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Categories</CardTitle>
                <CardDescription>Categories where your items perform best</CardDescription>
              </CardHeader>
              <CardContent>
                {insights.topSellingCategories.length > 0 ? (
                  <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                      <BarChart data={insights.topSellingCategories} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Items Sold">
                          {insights.topSellingCategories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 h-[400px]">
                    <p className="text-muted-foreground">No category data available yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ConsignorLayout>
  );
}
