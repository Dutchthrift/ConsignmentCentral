import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Search, Plus, Filter, ArrowUpDown } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderSummary } from "@shared/schema";

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount / 100);
};

// Function to get color based on order status
const getStatusColor = (status: string) => {
  switch (status) {
    case "submitted":
      return "bg-blue-500";
    case "processing":
      return "bg-yellow-500";
    case "received":
      return "bg-green-400";
    case "in_analysis":
      return "bg-violet-500";
    case "ready_for_sale":
      return "bg-emerald-500";
    case "partially_sold":
      return "bg-indigo-500";
    case "completed":
      return "bg-green-500";
    case "cancelled":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<"date" | "customer" | "amount">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  // Import useAuth for role-based access
  const { user } = useAuth();
  
  // Determine the appropriate endpoint based on user role
  // First try using the direct view endpoint for more reliable data access
  const ordersEndpoint = '/api/orders-direct';
  const backupEndpoint = user?.role === 'admin' ? '/api/admin/orders' : '/api/consignor/orders';

  // Fetch orders from direct view first
  const {
    data: orders,
    isLoading,
    error,
    refetch
  } = useQuery<{ success: boolean; data: OrderSummary[] }>({
    queryKey: [ordersEndpoint],
    gcTime: 5 * 60 * 1000,
    staleTime: 1 * 60 * 1000,
    retry: 1,
    retryDelay: 1000
  });
  
  // If direct view fails, try the backup endpoint
  const {
    data: backupOrders,
    isLoading: isLoadingBackup,
  } = useQuery<{ success: boolean; data: OrderSummary[] }>({
    queryKey: [backupEndpoint],
    gcTime: 5 * 60 * 1000,
    staleTime: 1 * 60 * 1000,
    enabled: !!error, // Only run if the first query fails
    retry: 2,
    retryDelay: 1000
  });
  
  // Debugging the orders data
  useEffect(() => {
    if (orders && 'success' in orders && 'data' in orders) {
      console.log("Orders data retrieved:", { 
        success: orders.success, 
        dataCount: orders.data?.length || 0,
        firstItem: orders.data?.[0] || null 
      });
    }
  }, [orders]);

  // Handle errors with a useEffect hook
  useEffect(() => {
    if (error) {
      console.error("Error loading orders:", error);
      toast({
        title: "Error",
        description: "Failed to load orders. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Handle search
  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    // If using the search API endpoint:
    // queryClient.invalidateQueries({ queryKey: ['/api/admin/orders/search'] });
  };

  // Handle sorting
  const handleSort = (column: "date" | "customer" | "amount") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // Safely combine data from both sources, preferring the primary source
  const orderData: OrderSummary[] = orders?.success && Array.isArray(orders.data) 
    ? orders.data 
    : backupOrders?.success && Array.isArray(backupOrders.data)
      ? backupOrders.data 
      : [];
      
  // Filter and sort orders - safely handle potentially missing data
  const filteredOrders = orderData.filter(
    (order: OrderSummary) =>
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customerEmail && order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.trackingCode &&
        order.trackingCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Log filtered orders for debugging  
  useEffect(() => {
    console.log(`Filtered ${filteredOrders.length} orders based on search: "${searchTerm}"`);
  }, [filteredOrders.length, searchTerm]);

  // Sort orders based on current sort settings
  const sortedOrders = [...filteredOrders].sort((a: OrderSummary, b: OrderSummary) => {
    if (sortColumn === "date") {
      return sortDirection === "asc"
        ? new Date(a.submissionDate).getTime() - new Date(b.submissionDate).getTime()
        : new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime();
    } else if (sortColumn === "customer") {
      return sortDirection === "asc"
        ? a.customerName.localeCompare(b.customerName)
        : b.customerName.localeCompare(a.customerName);
    } else {
      // Amount
      return sortDirection === "asc"
        ? a.totalValue - b.totalValue
        : b.totalValue - a.totalValue;
    }
  });

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            Manage consignor orders and track their status
          </p>
        </div>
        <Button onClick={() => setLocation("/orders/new")}>
          <Plus className="mr-2 h-4 w-4" /> New Order
        </Button>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
          <CardDescription>
            View and manage all consignment orders in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number, customer name, or tracking code..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" /> Filter
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-4 text-destructive">
              Failed to load orders. Please try again.
            </div>
          ) : sortedOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? "No orders found matching your search"
                : "No orders found. Create your first order!"}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>
                      <button
                        className="flex items-center"
                        onClick={() => handleSort("date")}
                      >
                        Submission Date
                        <ArrowUpDown
                          className={`ml-2 h-4 w-4 ${
                            sortColumn === "date" ? "opacity-100" : "opacity-50"
                          }`}
                        />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center"
                        onClick={() => handleSort("customer")}
                      >
                        Customer
                        <ArrowUpDown
                          className={`ml-2 h-4 w-4 ${
                            sortColumn === "customer" ? "opacity-100" : "opacity-50"
                          }`}
                        />
                      </button>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>
                      <button
                        className="flex items-center"
                        onClick={() => handleSort("amount")}
                      >
                        Total Value
                        <ArrowUpDown
                          className={`ml-2 h-4 w-4 ${
                            sortColumn === "amount" ? "opacity-100" : "opacity-50"
                          }`}
                        />
                      </button>
                    </TableHead>
                    <TableHead>Payout</TableHead>
                    <TableHead>Tracking</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link
                          to={`/orders/${order.id}`}
                          className="font-medium hover:underline text-blue-600"
                        >
                          {order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.submissionDate), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-sm text-muted-foreground">
                          {order.customerEmail}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.itemCount}</TableCell>
                      <TableCell>{formatCurrency(order.totalValue)}</TableCell>
                      <TableCell>{formatCurrency(order.totalPayout)}</TableCell>
                      <TableCell>
                        {order.trackingCode ? (
                          <span className="text-sm">{order.trackingCode}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Not shipped
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}