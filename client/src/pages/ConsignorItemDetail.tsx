import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

export default function ConsignorItemDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  // Fetch item details
  const { data: itemData, isLoading, error } = useQuery<any>({
    queryKey: ["/api/consignor/item", id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/consignor/item/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch item details");
      }
      return response.json();
    },
  });

  useEffect(() => {
    // If there's an error (like unauthorized access), redirect to dashboard
    if (error) {
      setLocation("/consignor/items");
    }
  }, [error, setLocation]);

  // Format item status for display
  const formatStatus = (status: string) => {
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

  // Get status badge color based on the item status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "received":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "analyzing":
        return "bg-indigo-100 text-indigo-800 hover:bg-indigo-200";
      case "pricing":
        return "bg-purple-100 text-purple-800 hover:bg-purple-200";
      case "approved":
        return "bg-teal-100 text-teal-800 hover:bg-teal-200";
      case "listed":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "sold":
        return "bg-orange-100 text-orange-800 hover:bg-orange-200";
      case "paid":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "returned":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
      case "rejected":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const item = itemData?.data;

  return (
    <div>
      <div className="mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          className="mb-4"
          asChild
        >
          <Link to="/consignor/items">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to My Items
          </Link>
        </Button>
        
        <h1 className="text-2xl font-bold">Item Details</h1>
        <p className="text-neutral-600">View details of your consigned item</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : item ? (
        <div className="space-y-6">
          {/* Item overview card */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{item.title || "Untitled Item"}</CardTitle>
                {item.status && (
                  <Badge variant="outline" className={getStatusColor(item.status)}>
                    {formatStatus(item.status)}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image */}
                <div className="aspect-square rounded-md overflow-hidden border">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-neutral-400"
                      >
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                        <circle cx="9" cy="9" r="2"></circle>
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-neutral-500">Reference ID</p>
                    <p className="font-medium">{item.referenceId}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-neutral-500">Brand</p>
                      <p className="font-medium">{item.brand || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Category</p>
                      <p className="font-medium">{item.category || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Condition</p>
                      <p className="font-medium">{item.condition || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Submission Date</p>
                      <p className="font-medium">
                        {item.createdAt 
                          ? new Date(item.createdAt).toLocaleDateString() 
                          : "—"
                        }
                      </p>
                    </div>
                  </div>
                  
                  {item.description && (
                    <div>
                      <p className="text-sm text-neutral-500">Description</p>
                      <p>{item.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Pricing Information */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-neutral-500">Estimated Market Value</p>
                  <p className="text-2xl font-bold">
                    {item.pricing?.averageMarketPrice 
                      ? `€${(item.pricing.averageMarketPrice / 100).toFixed(2)}`
                      : "Pending Analysis"
                    }
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-neutral-500">Recommended Listing Price</p>
                  <p className="text-2xl font-bold">
                    {item.pricing?.suggestedListingPrice 
                      ? `€${(item.pricing.suggestedListingPrice / 100).toFixed(2)}`
                      : "Pending"
                    }
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-neutral-500">Your Estimated Payout</p>
                  <p className="text-2xl font-bold text-green-600">
                    {item.pricing?.suggestedPayout 
                      ? `€${(item.pricing.suggestedPayout / 100).toFixed(2)}`
                      : "Pending"
                    }
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Based on a commission rate of {item.pricing?.commissionRate || "40"}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* AI Analysis */}
          {item.analysis && (
            <Card>
              <CardHeader>
                <CardTitle>AI Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-neutral-500">Product Type</p>
                      <p className="font-medium">{item.analysis.productType || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Brand</p>
                      <p className="font-medium">{item.analysis.brand || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Model</p>
                      <p className="font-medium">{item.analysis.model || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Condition</p>
                      <p className="font-medium">{item.analysis.condition || "—"}</p>
                    </div>
                  </div>
                  
                  {/* Optional: Accessories */}
                  {item.analysis.accessories && item.analysis.accessories.length > 0 && (
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">Included Accessories</p>
                      <ul className="list-disc pl-5">
                        {item.analysis.accessories.map((accessory: string, index: number) => (
                          <li key={index} className="text-sm">{accessory}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Notes */}
                  {item.analysis.additionalNotes && (
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">Additional Notes</p>
                      <p className="text-sm bg-neutral-50 p-3 rounded-md border">
                        {item.analysis.additionalNotes}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-neutral-500">Item not found or you don't have permission to view this item</p>
          <Button asChild className="mt-4">
            <Link to="/consignor/items">Return to My Items</Link>
          </Button>
        </div>
      )}
    </div>
  );
}