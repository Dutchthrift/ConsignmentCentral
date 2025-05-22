import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Database, BarChart2 } from "lucide-react";

export default function ViewerPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Fetching data...');
    
    // Fetch health status to make sure server is responsive
    fetch('/api/health')
      .then(res => res.json())
      .then(health => {
        console.log('Health check success:', health);
        
        // If health check passed, fetch order data
        return fetch('/api/orders-with-items');
      })
      .then(res => res.json())
      .then(ordersData => {
        console.log('Data loaded:', ordersData);
        setData(ordersData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching data:', err);
        setError('Could not connect to server. Please check your connection.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading Dutch Thrift data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Connection Error</h1>
        <p className="text-center mb-4">{error}</p>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    );
  }

  const orders = Array.isArray(data) ? data : [];
  
  // Calculate summary counts
  const totalOrders = orders.length;
  const totalItems = orders.reduce((sum, order) => sum + (order.items?.length || 0), 0);
  const totalValue = orders.reduce((sum, order) => {
    return sum + Number(order.total_estimated_value || 0);
  }, 0).toFixed(2);
  const totalPayout = orders.reduce((sum, order) => {
    return sum + Number(order.total_payout_value || 0);
  }, 0).toFixed(2);

  return (
    <div className="container mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Dutch Thrift Data Viewer</h1>
        <p className="text-muted-foreground">View your Supabase consignment data directly</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Database className="h-4 w-4 mr-2" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <BarChart2 className="h-4 w-4 mr-2" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalValue}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <BarChart2 className="h-4 w-4 mr-2" />
              Total Payout
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalPayout}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Orders with Items</h2>
        
        {orders.length === 0 ? (
          <p className="py-4">No orders found in database.</p>
        ) : (
          orders.map((order, index) => (
            <Card key={index} className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">
                  Order {order.order_number || order.id.slice(0, 8)}
                </CardTitle>
                <CardDescription>
                  Status: <span className="font-medium">{order.status}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between mb-2">
                  <span>Created: {new Date(order.created_at).toLocaleDateString()}</span>
                  <span className="font-medium">Total: €{order.total_estimated_value}</span>
                </div>
                
                <div className="mt-4 border-t pt-4">
                  <h3 className="font-medium mb-2">Items ({order.items?.length || 0})</h3>
                  {order.items && order.items.length > 0 ? (
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                          <div>
                            <div className="font-medium">{item.title}</div>
                            <div className="text-sm text-muted-foreground">{item.description?.substring(0, 50) || 'No description'}</div>
                          </div>
                          <div className="text-right">
                            <div>€{item.estimated_value}</div>
                            <div className="text-sm text-muted-foreground">Payout: €{item.payout_value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No items in this order</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}