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
import { Search, Filter, ArrowUpDown, Image } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ItemDetailModal } from "@/components/ItemDetailModal";

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount / 100);
};

// Function to get color based on item status
const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-500";
    case "submitted":
      return "bg-blue-500";
    case "received":
      return "bg-green-400";
    case "analyzing":
      return "bg-violet-500";
    case "pricing":
      return "bg-indigo-500";
    case "approved":
      return "bg-emerald-500";
    case "listed":
      return "bg-cyan-500";
    case "sold":
      return "bg-green-500";
    case "rejected":
      return "bg-red-500";
    case "returned":
      return "bg-orange-500";
    default:
      return "bg-gray-500";
  }
};

// Interface for item data
interface ItemData {
  id: number;
  referenceId: string;
  title: string;
  description: string;
  brand?: string;
  condition?: string;
  status: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
  suggestedListingPrice?: number;
  finalSalePrice?: number;
  finalPayout?: number;
  commissionRate?: number;
}

export default function ItemsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<"date" | "title" | "price">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{id: number, referenceId: string} | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Determine if user is admin or consignor for correct endpoint
  const [location] = useLocation();
  const isConsignor = user?.role === 'consignor' || location.includes('/consignor');
  const itemsEndpoint = isConsignor ? '/api/consignor/items' : '/api/admin/items';

  // Fetch items
  const {
    data: itemsResponse,
    isLoading,
    error,
  } = useQuery<{ success: boolean; data: ItemData[] }>({
    queryKey: [itemsEndpoint],
    gcTime: 5 * 60 * 1000,
    staleTime: 1 * 60 * 1000,
    retry: 2,
    retryDelay: 1000
  });
  
  // Debugging the items data
  useEffect(() => {
    if (itemsResponse) {
      console.log("Items data retrieved:", { 
        success: itemsResponse.success, 
        dataCount: itemsResponse.data?.length || 0,
        firstItem: itemsResponse.data?.[0] || null 
      });
    }
  }, [itemsResponse]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error("Error loading items:", error);
      toast({
        title: "Error",
        description: "Failed to load items. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Handle sorting
  const handleSort = (column: "date" | "title" | "price") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // Filter items based on search term
  const filteredItems = itemsResponse?.success && itemsResponse?.data
    ? itemsResponse.data.filter(
        (item: ItemData) =>
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  // Handle item click - navigate to item detail page
  const handleItemClick = (referenceId: string) => {
    if (isConsignor) {
      // Open the modal with the item details
      setSelectedItemId(referenceId);
    }
  };
  
  // Sort items based on current sort settings
  const sortedItems = [...filteredItems].sort((a: ItemData, b: ItemData) => {
    if (sortColumn === "date") {
      return sortDirection === "asc"
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortColumn === "title") {
      return sortDirection === "asc"
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title);
    } else {
      // Price sorting with null handling
      const priceA = a.suggestedListingPrice || 0;
      const priceB = b.suggestedListingPrice || 0;
      return sortDirection === "asc" ? priceA - priceB : priceB - priceA;
    }
  });

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Items</h1>
          <p className="text-muted-foreground">
            Manage your consignment items and track their status
          </p>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Item Management</CardTitle>
          <CardDescription>
            View and manage all your consignment items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, reference ID, or brand..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
              Failed to load items. Please try again.
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? "No items found matching your search"
                : "No items found in your account."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>
                      <button
                        className="flex items-center"
                        onClick={() => handleSort("title")}
                      >
                        Item Details
                        <ArrowUpDown
                          className={`ml-2 h-4 w-4 ${
                            sortColumn === "title" ? "opacity-100" : "opacity-50"
                          }`}
                        />
                      </button>
                    </TableHead>
                    <TableHead>Status</TableHead>
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
                        onClick={() => handleSort("price")}
                      >
                        Value
                        <ArrowUpDown
                          className={`ml-2 h-4 w-4 ${
                            sortColumn === "price" ? "opacity-100" : "opacity-50"
                          }`}
                        />
                      </button>
                    </TableHead>
                    <TableHead>Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.imageUrl ? (
                          <div className="h-12 w-12 rounded overflow-hidden bg-gray-100">
                            <img 
                              src={item.imageUrl} 
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-12 rounded flex items-center justify-center bg-gray-100">
                            <Image className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {/* Using the item ID directly to avoid navigation issues */}
                        <span 
                          onClick={() => handleItemClick(item.referenceId)}
                          className="font-medium hover:underline text-blue-600 cursor-pointer"
                        >
                          {item.referenceId}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.brand && <span>{item.brand}</span>}
                          {item.condition && <span> • {item.condition}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.createdAt), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        {item.suggestedListingPrice ? (
                          formatCurrency(item.suggestedListingPrice)
                        ) : (
                          <span className="text-muted-foreground">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.finalPayout ? (
                          formatCurrency(item.finalPayout)
                        ) : item.suggestedListingPrice && item.commissionRate ? (
                          formatCurrency(
                            item.suggestedListingPrice * (1 - item.commissionRate / 100)
                          )
                        ) : (
                          <span className="text-muted-foreground">Pending</span>
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