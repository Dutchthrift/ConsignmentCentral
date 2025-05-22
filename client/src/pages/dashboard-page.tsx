import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BarChart2, Package, Users, ShoppingBag } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch stats
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.stats);
        } else {
          setError(data.message || 'Failed to load stats');
        }
      })
      .catch(err => {
        console.error('Error fetching stats:', err);
        setError('Server error: Failed to load dashboard data');
      })
      .finally(() => setLoading(false));

    // Fetch orders
    fetch('/api/admin/orders')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOrders(data.orders || []);
        }
      })
      .catch(err => {
        console.error('Error fetching orders:', err);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-red-500">{error}</p>
        <p className="mt-4">Please check your server connection and try again.</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dutch Thrift Admin</h1>
      <p className="text-muted-foreground">Welcome to your consignment platform dashboard.</p>
      
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Consignors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.consignorCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.orderCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.itemCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{stats.totalItemValue}</div>
              <p className="text-xs text-muted-foreground">
                Payout: €{stats.totalPayoutValue}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="space-y-4">
          <h2 className="text-xl font-semibold mt-6">Recent Orders</h2>
          
          {orders.length === 0 ? (
            <p className="text-muted-foreground py-4">No orders found.</p>
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <CardTitle>Order {order.order_number || order.id.slice(0, 8)}</CardTitle>
                    <CardDescription>
                      {order.customers?.name || 'Unknown Customer'} - 
                      Created on {new Date(order.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between mb-4">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {order.status}
                      </span>
                      <span className="font-medium">
                        Total: €{order.total_estimated_value}
                      </span>
                    </div>
                    
                    <div className="border rounded-md p-3">
                      <h4 className="font-medium mb-2">Items ({order.items?.length || 0})</h4>
                      {order.items && order.items.length > 0 ? (
                        <ul className="space-y-1">
                          {order.items.map((item: any) => (
                            <li key={item.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                              <span>{item.title}</span>
                              <span>€{item.estimated_value}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No items in this order</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button variant="outline" size="sm">View Details</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="items">
          <div className="rounded-md border mt-6">
            <div className="p-4">
              <h3 className="text-lg font-medium">Item List</h3>
              <p className="text-sm text-muted-foreground">
                All items in the inventory
              </p>
            </div>
            <div className="p-4">
              <p>Select the Orders tab to view items organized by order.</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}