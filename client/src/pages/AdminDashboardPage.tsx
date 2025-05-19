import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, PackageOpen, ShoppingCart, Users, TrendingUp, CreditCard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import AllIntakes from "@/components/AllIntakes";
import ItemDetailsModal from "@/components/ItemDetailsModal";

interface DashboardStats {
  totalItems: number;
  pendingItems: number;
  approvedItems: number;
  rejectedItems: number;
  totalConsignors: number;
  activeConsignors: number;
  totalSales: number;
  monthlyRevenue: number;
  totalPayouts: number;
  pendingPayouts: number;
  inventoryValue: number;
}

const DEFAULT_STATS: DashboardStats = {
  totalItems: 0,
  pendingItems: 0,
  approvedItems: 0,
  rejectedItems: 0,
  totalConsignors: 0,
  activeConsignors: 0,
  totalSales: 0,
  monthlyRevenue: 0,
  totalPayouts: 0,
  pendingPayouts: 0,
  inventoryValue: 0
};

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/admin/stats");
        if (!response.ok) {
          throw new Error("Failed to fetch admin stats");
        }
        return await response.json();
      } catch (err) {
        console.error("Error fetching admin stats:", err);
        toast({
          variant: "destructive",
          title: "Error loading dashboard",
          description: "Could not load admin statistics. Please try again later."
        });
        return DEFAULT_STATS;
      }
    },
    enabled: !!user && user.role === "admin"
  });

  const dashboardStats = stats || DEFAULT_STATS;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl p-4">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertCircle className="mr-2 h-5 w-5" />
              Error Loading Dashboard
            </CardTitle>
            <CardDescription>
              There was a problem loading the dashboard data. Please try refreshing the page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const progressPercentage = dashboardStats.totalItems > 0 
    ? Math.round((dashboardStats.approvedItems / dashboardStats.totalItems) * 100) 
    : 0;

  return (
    <div className="mx-auto max-w-7xl p-4">
      <h1 className="mb-6 text-3xl font-bold">Admin Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
            <PackageOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.pendingItems} pending intake
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{dashboardStats.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              €{dashboardStats.totalSales.toLocaleString()} total sales
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consignors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalConsignors}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.activeConsignors} active sellers
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{dashboardStats.pendingPayouts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              €{dashboardStats.totalPayouts.toLocaleString()} total payouts
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Intake Overview</CardTitle>
            <CardDescription>
              Current inventory breakdown and approval rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Approval Rate</p>
                <p className="text-xs text-muted-foreground">
                  {dashboardStats.approvedItems} approved of {dashboardStats.totalItems} items
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{progressPercentage}%</Badge>
              </div>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-green-600">{dashboardStats.approvedItems}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
              <div>
                <p className="text-lg font-bold text-yellow-600">{dashboardStats.pendingItems}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-600">{dashboardStats.rejectedItems}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" className="justify-between w-full">
              Process Intake Items
              <ArrowUpRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="justify-between w-full">
              Approve Payouts
              <ArrowUpRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="justify-between w-full">
              Manage Consignors
              <ArrowUpRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="justify-between w-full">
              Review Orders
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;