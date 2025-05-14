import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ConsignorStatsProps {
  stats?: {
    totalItems: number;
    totalSales: number;
    itemsPerStatus: Record<string, number>;
  };
  consignor?: {
    id: number;
    name: string;
    email: string;
  };
  isLoading: boolean;
}

export default function ConsignorStats({ stats, consignor, isLoading }: ConsignorStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {/* Total Items Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Items</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold">{stats?.totalItems || 0}</div>
          )}
        </CardContent>
      </Card>

      {/* Total Sales Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold">€{(stats?.totalSales || 0).toFixed(2)}</div>
          )}
        </CardContent>
      </Card>

      {/* Active Listings Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold">{stats?.itemsPerStatus?.["listed"] || 0}</div>
          )}
        </CardContent>
      </Card>

      {/* Sold Items Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sold Items</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold">
              {(stats?.itemsPerStatus?.["sold"] || 0) + (stats?.itemsPerStatus?.["paid"] || 0)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}