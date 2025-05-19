import React, { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  OrderWithDetails,
  OrderStatus,
  Item,
  Analysis,
  Pricing,
  Shipping,
} from "@shared/schema";
import { format } from "date-fns";
import {
  ArrowLeft,
  Package,
  Truck,
  Edit,
  Trash,
  Info,
  CircleDollarSign,
  ClipboardList,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [trackingCode, setTrackingCode] = useState("");
  const [orderStatus, setOrderStatus] = useState<string>("");
  const [isEditingTracking, setIsEditingTracking] = useState(false);
  const queryClient = useQueryClient();

  // Get order details
  const {
    data: orderData,
    isLoading,
    error,
  } = useQuery<{ success: boolean; data: OrderWithDetails }>({
    queryKey: ["/api/admin/orders", id],
    // Use latest TanStack Query v5 format for callbacks 
    gcTime: 5 * 60 * 1000,
    staleTime: 1 * 60 * 1000,
  });
  
  // Set up state after data is loaded
  React.useEffect(() => {
    if (orderData?.data) {
      setOrderStatus(orderData.data.status);
      if (orderData.data.trackingCode) {
        setTrackingCode(orderData.data.trackingCode);
      }
    }
  }, [orderData]);
  
  // Handle errors with a useEffect hook
  React.useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load order details. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const order = orderData?.data;

  // Mutation to update tracking code
  const updateTrackingMutation = useMutation({
    mutationFn: async (newTrackingCode: string) => {
      const res = await apiRequest("PATCH", `/api/admin/orders/${id}/tracking`, {
        trackingCode: newTrackingCode,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tracking code has been updated.",
      });
      setIsEditingTracking(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders", id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update tracking code.",
        variant: "destructive",
      });
    },
  });

  // Mutation to update order status
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await apiRequest("PATCH", `/api/admin/orders/${id}/status`, {
        status: newStatus,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Order status has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders", id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      });
      // Reset status to the original value
      if (order) {
        setOrderStatus(order.status);
      }
    },
  });

  // Handle tracking code update
  const handleTrackingUpdate = () => {
    if (trackingCode.trim()) {
      updateTrackingMutation.mutate(trackingCode);
    }
  };

  // Handle status change
  const handleStatusChange = (value: string) => {
    setOrderStatus(value);
    updateStatusMutation.mutate(value);
  };

  // Calculate totals
  const calculateTotals = () => {
    if (!order) return { totalValue: 0, totalPayout: 0, totalItems: 0 };
    
    // Check if order.items exists and is an array
    if (!order.items || !Array.isArray(order.items)) {
      console.warn('Order items is undefined or not an array:', order);
      return { totalValue: 0, totalPayout: 0, totalItems: 0 };
    }

    const totalValue = order.items.reduce(
      (sum: number, item: Item & { pricing?: Pricing }) => sum + (item.pricing?.suggestedListingPrice || 0),
      0
    );
    const totalPayout = order.items.reduce(
      (sum: number, item: Item & { pricing?: Pricing }) => sum + (item.pricing?.suggestedPayout || 0),
      0
    );

    return {
      totalValue,
      totalPayout,
      totalItems: order.items.length,
    };
  };

  const { totalValue, totalPayout, totalItems } = calculateTotals();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/orders")}
            className="mr-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-96 w-full mt-6" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/orders")}
            className="mr-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-bold">Error Loading Order</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8">
              <AlertCircle className="h-16 w-16 text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Failed to load order details
              </h2>
              <p className="text-muted-foreground mb-4">
                There was a problem loading this order. Please try again.
              </p>
              <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/orders", id] })}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div className="flex items-center mb-4 sm:mb-0">
          <Button
            variant="ghost"
            onClick={() => setLocation("/orders")}
            className="mr-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
            <p className="text-muted-foreground">
              Submitted on{" "}
              {order.submissionDate ? format(new Date(order.submissionDate), "dd MMMM yyyy, HH:mm") : "N/A"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={orderStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(OrderStatus).map(([key, value]) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center">
                    <Badge className={`${getStatusColor(value)} mr-2`}>
                      &nbsp;
                    </Badge>
                    {value?.replace(/_/g, " ") || value}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setLocation(`/orders/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
            <CardDescription>Contact details for the consignor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-semibold">
                {order.customer?.name || `Customer #${order.customerId}`}
              </p>
              <p>{order.customer?.email || "No email available"}</p>
              {order.customer?.phone && <p>{order.customer.phone}</p>}
              {order.customer?.address && (
                <div className="mt-2 text-sm">
                  <p>{order.customer.address}</p>
                  <p>
                    {order.customer.postal_code || ""} {order.customer.city || ""}
                    {order.customer.state && `, ${order.customer.state}`}
                  </p>
                  <p>{order.customer.country || ""}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
            <CardDescription>Overview of order items and value</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between text-sm">
                <dt>Order Status:</dt>
                <dd>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status?.replace(/_/g, " ") || order.status || "Unknown"}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt>Items Count:</dt>
                <dd>{totalItems}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt>Total Value:</dt>
                <dd className="font-medium">{formatCurrency(totalValue)}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt>Total Payout:</dt>
                <dd className="font-medium">{formatCurrency(totalPayout)}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt>Commission:</dt>
                <dd className="font-medium">
                  {formatCurrency(totalValue - totalPayout)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipping Information</CardTitle>
            <CardDescription>Tracking and delivery details</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditingTracking ? (
              <div className="space-y-2">
                <Input
                  placeholder="Enter tracking code"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={handleTrackingUpdate}
                    disabled={updateTrackingMutation.isPending}
                    className="flex-1"
                  >
                    {updateTrackingMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditingTracking(false);
                      setTrackingCode(order.trackingCode || "");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Tracking Code:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingTracking(true)}
                      className="h-8 px-2"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {order.trackingCode ? (
                    <p className="text-sm">{order.trackingCode}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No tracking code assigned
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="items">
        <TabsList className="mb-4">
          <TabsTrigger value="items">
            <Package className="mr-2 h-4 w-4" /> Items
          </TabsTrigger>
          <TabsTrigger value="notes">
            <ClipboardList className="mr-2 h-4 w-4" /> Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Items in this Order</CardTitle>
                <CardDescription>
                  Manage items included in this consignment order
                </CardDescription>
              </div>
              <Button onClick={() => setLocation(`/orders/${id}/add-item`)}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent>
              {!order.items || order.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items in this order. Add your first item to get started.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference ID</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Listing Price</TableHead>
                        <TableHead>Payout</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item: Item & { pricing?: Pricing, analysis?: Analysis, shipping?: Shipping }) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <Link
                              to={`/items/${item.referenceId}`}
                              className="text-blue-600 hover:underline"
                            >
                              {item.referenceId}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium line-clamp-1">
                              {item.title}
                            </div>
                            {item.imageUrl && (
                              <div className="mt-1">
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  className="h-8 w-8 object-cover rounded-sm"
                                />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(item.status)}>
                              {item.status?.replace(/_/g, " ") || item.status || "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.pricing?.suggestedListingPrice
                              ? formatCurrency(
                                  item.pricing.suggestedListingPrice
                                )
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {item.pricing?.suggestedPayout
                              ? formatCurrency(item.pricing.suggestedPayout)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setLocation(`/items/${item.referenceId}`)
                              }
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Order Notes</CardTitle>
              <CardDescription>
                Add internal notes about this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add notes about this order..."
                className="min-h-32"
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>Save Notes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}