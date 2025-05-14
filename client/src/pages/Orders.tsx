import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  SlidersHorizontal, 
  Calendar, 
  Package, 
  Download,
  Eye,
  ShoppingCart,
  CreditCard,
  ArrowUpDown,
  ExternalLink,
} from "lucide-react";

export default function Orders() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Simulate orders data - in a real implementation this would come from an API
  const isLoading = false;
  const mockOrders = [
    {
      id: "ORD-123456",
      shopifyOrderId: "SHF-789012",
      date: "2025-05-01T10:30:00Z",
      customer: {
        name: "Jane Cooper",
        email: "jane.cooper@example.com",
      },
      items: [
        {
          referenceId: "CS-250501-001",
          title: "Fuji DL-1000 Zoom Camera",
          price: 249.99,
          image: null,
        }
      ],
      total: 249.99,
      payouts: 189.99,
      status: "processing",
    },
    {
      id: "ORD-123455",
      shopifyOrderId: "SHF-789011",
      date: "2025-04-28T14:15:00Z",
      customer: {
        name: "Alex Morgan",
        email: "alex.morgan@example.com",
      },
      items: [
        {
          referenceId: "CS-250428-002",
          title: "Vintage Leather Jacket",
          price: 189.95,
          image: null,
        }
      ],
      total: 189.95,
      payouts: 145.50,
      status: "shipped",
    },
    {
      id: "ORD-123454",
      shopifyOrderId: "SHF-789010",
      date: "2025-04-25T11:00:00Z",
      customer: {
        name: "Robert Johnson",
        email: "robert.johnson@example.com",
      },
      items: [
        {
          referenceId: "CS-250423-003",
          title: "Nintendo Switch Console",
          price: 289.99,
          image: null,
        }
      ],
      total: 289.99,
      payouts: 220.50,
      status: "delivered",
    },
    {
      id: "ORD-123453",
      shopifyOrderId: "SHF-789009",
      date: "2025-04-20T09:45:00Z",
      customer: {
        name: "Sarah Williams",
        email: "sarah.williams@example.com",
      },
      items: [
        {
          referenceId: "CS-250420-004",
          title: "Mechanical Keyboard",
          price: 129.99,
          image: null,
        }
      ],
      total: 129.99,
      payouts: 99.50,
      status: "completed",
    },
  ];
  
  // Filter orders based on search query and active tab
  const filteredOrders = mockOrders.filter(order => {
    const matchesSearch = !searchQuery || 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shopifyOrderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesTab = activeTab === "all" || 
      (activeTab === "processing" && ["processing"].includes(order.status)) ||
      (activeTab === "shipped" && ["shipped", "delivered"].includes(order.status)) ||
      (activeTab === "completed" && ["completed"].includes(order.status));
      
    return matchesSearch && matchesTab;
  });
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };
  
  // Status badges
  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      processing: "bg-amber-100 text-amber-800",
      shipped: "bg-blue-100 text-blue-800",
      delivered: "bg-cyan-100 text-cyan-800",
      completed: "bg-emerald-100 text-emerald-800",
    };
    
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    
    return (
      <Badge variant="outline" className={`${statusColors[status] || "bg-gray-100 text-gray-800"}`}>
        {statusText}
      </Badge>
    );
  };
  
  // Get action button based on order status
  const getActionButton = (order: any) => {
    switch (order.status) {
      case "processing":
        return (
          <Button size="sm" className="flex items-center mr-2">
            <Package className="h-4 w-4 mr-1" /> Fulfill
          </Button>
        );
      case "shipped":
        return (
          <Button size="sm" className="flex items-center mr-2">
            <CreditCard className="h-4 w-4 mr-1" /> Process Payout
          </Button>
        );
      default:
        return (
          <Button size="sm" variant="outline" className="flex items-center mr-2">
            <Eye className="h-4 w-4 mr-1" /> View
          </Button>
        );
    }
  };
  
  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">Orders</CardTitle>
          <Button className="flex items-center">
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
              <Input
                placeholder="Search by order ID or product..."
                className="pl-8"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Date Range
              </Button>
              <Button variant="outline" className="flex items-center">
                <SlidersHorizontal className="h-4 w-4 mr-1" />
                Filters
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Orders</TabsTrigger>
              <TabsTrigger value="processing">Processing</TabsTrigger>
              <TabsTrigger value="shipped">Shipped</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab}>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                        Order <Button variant="ghost" size="sm" className="p-0 h-auto">
                          <ArrowUpDown className="h-3 w-3 text-neutral-400" />
                        </Button>
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                        Customer
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                        Total
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                        Payout
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      // Loading state
                      Array(5)
                        .fill(0)
                        .map((_, index) => (
                          <tr key={index} className="border-b border-neutral-200">
                            <td className="py-3 px-4">
                              <Skeleton className="h-4 w-24" />
                            </td>
                            <td className="py-3 px-4">
                              <Skeleton className="h-4 w-32" />
                            </td>
                            <td className="py-3 px-4">
                              <Skeleton className="h-4 w-24" />
                            </td>
                            <td className="py-3 px-4">
                              <Skeleton className="h-5 w-16 rounded-full" />
                            </td>
                            <td className="py-3 px-4">
                              <Skeleton className="h-4 w-16" />
                            </td>
                            <td className="py-3 px-4">
                              <Skeleton className="h-4 w-16" />
                            </td>
                            <td className="py-3 px-4">
                              <Skeleton className="h-8 w-20 rounded" />
                            </td>
                          </tr>
                        ))
                    ) : filteredOrders.length > 0 ? (
                      // Actual data
                      filteredOrders.map((order) => (
                        <tr
                          key={order.id}
                          className="border-b border-neutral-200 hover:bg-neutral-50"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-sm">{order.id}</p>
                              <p className="text-xs text-neutral-500">
                                {order.shopifyOrderId}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-neutral-600">
                            {formatDate(order.date)}
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-sm">{order.customer.name}</p>
                              <p className="text-xs text-neutral-500">{order.customer.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium">
                            ${order.total.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-sm text-neutral-600">
                            ${order.payouts.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              {getActionButton(order)}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-neutral-500 hover:text-primary"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      // No data state
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-neutral-500">
                          {searchQuery 
                            ? "No orders match your search criteria" 
                            : "No orders found in this category"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}