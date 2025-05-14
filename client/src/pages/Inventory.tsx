import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package, 
  Search, 
  SlidersHorizontal, 
  ArrowUpDown, 
  Edit,
  Tag,
  Truck,
  ShoppingCart,
  MoreVertical,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import ItemDetailModal from "@/components/ItemDetailModal";

export default function Inventory() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  
  // Fetch all items
  const { data: inventoryData, isLoading: isInventoryLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/items/recent"],
  });
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const handleItemClick = (referenceId: string) => {
    setSelectedItem(referenceId);
  };
  
  const handleCloseModal = () => {
    setSelectedItem(null);
  };
  
  // Filter items based on search query and active tab
  const filteredItems = inventoryData?.data?.filter((item: any) => {
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.referenceId.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesTab = activeTab === "all" || 
      (activeTab === "pending" && ["pending", "analyzed"].includes(item.status)) ||
      (activeTab === "inventory" && ["received", "listed"].includes(item.status)) ||
      (activeTab === "sold" && ["sold", "paid"].includes(item.status));
      
    return matchesSearch && matchesTab;
  }) || [];
  
  // Status badges
  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800",
      analyzed: "bg-green-100 text-green-800",
      shipped: "bg-blue-100 text-blue-800",
      received: "bg-cyan-100 text-cyan-800",
      listed: "bg-blue-100 text-blue-800",
      sold: "bg-purple-100 text-purple-800",
      paid: "bg-emerald-100 text-emerald-800",
    };
    
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    
    return (
      <Badge variant="outline" className={`${statusColors[status] || "bg-gray-100 text-gray-800"}`}>
        {statusText}
      </Badge>
    );
  };
  
  // Get action button based on item status
  const getActionButton = (item: any) => {
    switch (item.status) {
      case "pending":
        return (
          <Button size="sm" className="flex items-center mr-2">
            <Edit className="h-4 w-4 mr-1" /> Analyze
          </Button>
        );
      case "analyzed":
        return (
          <Button size="sm" className="flex items-center mr-2">
            <Truck className="h-4 w-4 mr-1" /> Ship Label
          </Button>
        );
      case "received":
        return (
          <Button size="sm" className="flex items-center mr-2">
            <Tag className="h-4 w-4 mr-1" /> List Item
          </Button>
        );
      case "listed":
        return (
          <Button size="sm" className="flex items-center mr-2">
            <Edit className="h-4 w-4 mr-1" /> Edit Listing
          </Button>
        );
      case "sold":
        return (
          <Button size="sm" className="flex items-center mr-2">
            <ShoppingCart className="h-4 w-4 mr-1" /> Process
          </Button>
        );
      default:
        return null;
    }
  };
  
  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">Inventory Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
              <Input
                placeholder="Search by title or reference ID..."
                className="pl-8"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            <Button variant="outline" className="flex items-center">
              <SlidersHorizontal className="h-4 w-4 mr-1" />
              Filters
            </Button>
          </div>
          
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Items</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="inventory">Active Inventory</TabsTrigger>
              <TabsTrigger value="sold">Sold</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab}>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                        Item <Button variant="ghost" size="sm" className="p-0 h-auto">
                          <ArrowUpDown className="h-3 w-3 text-neutral-400" />
                        </Button>
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                        Customer
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                        Listed Price
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
                    {isInventoryLoading ? (
                      // Loading state
                      Array(5)
                        .fill(0)
                        .map((_, index) => (
                          <tr key={index} className="border-b border-neutral-200">
                            <td className="py-3 px-4">
                              <div className="flex items-center">
                                <Skeleton className="h-10 w-10 rounded mr-3" />
                                <div>
                                  <Skeleton className="h-4 w-24 mb-1" />
                                  <Skeleton className="h-3 w-16" />
                                </div>
                              </div>
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
                    ) : filteredItems.length > 0 ? (
                      // Actual data
                      filteredItems.map((item: any) => (
                        <tr
                          key={item.referenceId}
                          className="border-b border-neutral-200 hover:bg-neutral-50 cursor-pointer"
                          onClick={() => handleItemClick(item.referenceId)}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  className="w-10 h-10 rounded object-cover mr-3"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-neutral-200 rounded mr-3 flex items-center justify-center text-neutral-500">
                                  <Package className="h-5 w-5" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm">{item.title}</p>
                                <p className="text-xs text-neutral-500">
                                  {item.referenceId}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {item.customer?.name || "N/A"}
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(item.status)}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium">
                            {item.pricing?.estimatedPrice
                              ? `$${item.pricing.estimatedPrice.toFixed(2)}`
                              : "-"}
                          </td>
                          <td className="py-3 px-4 text-sm text-neutral-600">
                            {item.pricing?.payout
                              ? `$${item.pricing.payout.toFixed(2)}`
                              : "-"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                              {getActionButton(item)}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-neutral-500 hover:text-primary"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      // No data state
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-500">
                          {searchQuery 
                            ? "No items match your search criteria" 
                            : "No items found in this category"}
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
      
      {/* Item detail modal */}
      {selectedItem && (
        <ItemDetailModal 
          referenceId={selectedItem} 
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}