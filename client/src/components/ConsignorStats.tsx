import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ChevronUp, ChevronDown, Equal } from "lucide-react";

type StatsProps = {
  stats: {
    totalItems?: number;
    itemsPerStatus?: Record<string, number>;
    totalSales?: number;
    recentSales?: number;
  } | undefined;
  consignor: {
    id: number;
    name: string;
    email: string;
    totalItems: number;
    totalSales: number;
  } | undefined;
  isLoading: boolean;
};

export default function ConsignorStats({ stats, consignor, isLoading }: StatsProps) {
  // Commission tiers
  const commissionTiers = [
    { min: 0, max: 100, rate: 40 },
    { min: 100, max: 200, rate: 35 },
    { min: 200, max: 300, rate: 30 },
    { min: 300, max: Infinity, rate: 25 },
  ];
  
  // Helper function to calculate trend indicator
  const getTrendIndicator = (value?: number) => {
    if (!value) return <Equal className="h-4 w-4 text-neutral-500" />;
    
    if (value > 0) {
      return <ChevronUp className="h-4 w-4 text-green-500" />;
    } else if (value < 0) {
      return <ChevronDown className="h-4 w-4 text-red-500" />;
    } else {
      return <Equal className="h-4 w-4 text-neutral-500" />;
    }
  };
  
  // Helper function to get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending Intake";
      case "received":
        return "Received";
      case "analyzing":
        return "Analyzing";
      case "pricing":
        return "Pricing";
      case "approved":
        return "Approved";
      case "listed":
        return "Listed";
      case "sold":
        return "Sold";
      case "paid":
        return "Paid Out";
      case "returned":
        return "Returned";
      case "rejected":
        return "Rejected";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          <div className="flex items-center text-neutral-500">
            {getTrendIndicator(stats?.recentSales)}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className="text-2xl font-bold">
                {Object.values(stats?.itemsPerStatus || {}).reduce((sum, count) => sum + (count || 0), 0) || 0}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Items in consignment
              </p>
            </>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          <div className="rounded-full bg-green-100 p-1">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="text-green-700"
            >
              <path d="M2 20h20"></path>
              <path d="M5 4v16"></path>
              <path d="M12 4v16"></path>
              <path d="M19 4v16"></path>
            </svg>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <>
              <div className="text-2xl font-bold">
                €{stats?.totalSales?.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Lifetime sales amount
              </p>
            </>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sold Items</CardTitle>
          <div className="rounded-full bg-blue-100 p-1">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="text-blue-700"
            >
              <path d="M7 10v12"></path>
              <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"></path>
            </svg>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className="text-2xl font-bold">
                {(stats?.itemsPerStatus?.sold || 0) + (stats?.itemsPerStatus?.paid || 0)}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Total items sold
              </p>
            </>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
          <div className="rounded-full bg-amber-100 p-1">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="text-amber-700"
            >
              <path d="M2 20h.01"></path>
              <path d="M7 20v-4"></path>
              <path d="M12 20v-8"></path>
              <path d="M17 20v-6"></path>
              <path d="M22 20V8"></path>
            </svg>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            Sliding Scale
          </div>
          <div className="mt-2 text-xs space-y-1">
            {commissionTiers.map((tier, index) => (
              <div key={index} className="flex justify-between items-center">
                <span>
                  {tier.min === 0 ? "€0" : `€${tier.min}`} - {tier.max === Infinity ? "∞" : `€${tier.max}`}:
                </span>
                <span className="font-medium">{tier.rate}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Status breakdown card - on wider screens this spans full width */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-lg">Item Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Object.entries(stats?.itemsPerStatus || {})
                .filter(([key]) => key !== "total") // Skip total count
                .map(([status, count]) => (
                  <div 
                    key={status} 
                    className="bg-background border rounded-lg p-3 flex flex-col"
                  >
                    <span className="text-sm text-neutral-500">
                      {getStatusLabel(status)}
                    </span>
                    <span className="text-xl font-bold mt-1">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}