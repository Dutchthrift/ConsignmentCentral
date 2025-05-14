import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

type ItemDetailModalProps = {
  referenceId: string;
  onClose: () => void;
};

export default function ItemDetailModal({ referenceId, onClose }: ItemDetailModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");
  const [payoutType, setPayoutType] = useState<string | undefined>(undefined);
  
  // Fetch item details
  const { data: itemData, isLoading } = useQuery<any>({
    queryKey: ["/api/items", referenceId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/items/${referenceId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch item details");
      }
      return response.json();
    },
  });
  
  // Update payout preference mutation
  const updatePayoutMutation = useMutation({
    mutationFn: async (payoutType: string) => {
      const response = await apiRequest(
        "POST", 
        `/api/consignor/items/${itemData.data.id}/payout`, 
        { payoutType }
      );
      
      if (!response.ok) {
        throw new Error("Failed to update payout preference");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/items", referenceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/consignor/dashboard"] });
      
      toast({
        title: "Payout preference updated",
        description: "Your payout preference has been successfully updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });
  
  const handleUpdatePayoutType = () => {
    if (payoutType && itemData?.data?.id) {
      updatePayoutMutation.mutate(payoutType);
    }
  };
  
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
    <Dialog open={!!referenceId} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isLoading ? (
              <Skeleton className="h-6 w-64" />
            ) : (
              <div className="flex items-center justify-between">
                <span>{item?.title || "Item Details"}</span>
                {item?.status && (
                  <Badge variant="outline" className={getStatusColor(item.status)}>
                    {formatStatus(item.status)}
                  </Badge>
                )}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-40 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ) : (
          <>
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="shipping">Shipping</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                {/* Image and basic details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="aspect-square rounded-md overflow-hidden border">
                    {item?.imageUrl ? (
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
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">{item?.title}</h3>
                      <p className="text-sm text-neutral-500">{item?.referenceId}</p>
                      <p className="text-sm mt-2">{item?.description}</p>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-neutral-500">Brand</p>
                        <p className="font-medium">{item?.brand || "—"}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Category</p>
                        <p className="font-medium">{item?.category || "—"}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Condition</p>
                        <p className="font-medium">{item?.condition || "—"}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Size</p>
                        <p className="font-medium">{item?.size || "—"}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Color</p>
                        <p className="font-medium">{item?.color || "—"}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Material</p>
                        <p className="font-medium">{item?.material || "—"}</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="text-sm">
                      <p className="text-neutral-500">Received on</p>
                      <p className="font-medium">
                        {item?.createdAt 
                          ? new Date(item.createdAt).toLocaleDateString() + " (" + 
                            formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) + ")"
                          : "—"
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="pricing" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Pricing Information</CardTitle>
                    <CardDescription>
                      Details about pricing, commission, and payout
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Selling and payout information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-neutral-500">Estimated Market Value</p>
                          <p className="text-xl font-medium">
                            {item?.pricing?.averageMarketPrice 
                              ? `€${(item.pricing.averageMarketPrice / 100).toFixed(2)}`
                              : "Pending Analysis"
                            }
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-neutral-500">Suggested Listing Price</p>
                          <p className="text-xl font-medium">
                            {item?.pricing?.suggestedListingPrice 
                              ? `€${(item.pricing.suggestedListingPrice / 100).toFixed(2)}`
                              : "Pending"
                            }
                          </p>
                        </div>
                        
                        {item?.status === "sold" && (
                          <div>
                            <p className="text-sm text-neutral-500">Final Sale Price</p>
                            <p className="text-xl font-medium">
                              {item?.pricing?.finalSalePrice 
                                ? `€${(item.pricing.finalSalePrice / 100).toFixed(2)}`
                                : "—"
                              }
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-neutral-500">Commission Rate</p>
                          <p className="text-xl font-medium">
                            {item?.pricing?.commissionRate
                              ? `${item.pricing.commissionRate}%`
                              : "Pending"
                            }
                          </p>
                          <p className="text-xs text-neutral-500 mt-1">
                            Based on a sliding scale: 25-40% depending on item value
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-neutral-500">Estimated Payout</p>
                          <p className="text-xl font-medium">
                            {item?.pricing?.suggestedPayout
                              ? `€${(item.pricing.suggestedPayout / 100).toFixed(2)}`
                              : "Pending"
                            }
                          </p>
                        </div>
                        
                        {(item?.status === "sold" || item?.status === "paid") && (
                          <div>
                            <p className="text-sm text-neutral-500">Final Payout</p>
                            <p className="text-xl font-medium">
                              {item?.pricing?.finalPayout
                                ? `€${(item.pricing.finalPayout / 100).toFixed(2)}`
                                : "—"
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Payout preference selector - only enabled for sold items not yet paid out */}
                    <div>
                      <p className="text-sm font-medium mb-2">Payout Preference</p>
                      
                      <div className="flex gap-4 items-end">
                        <div className="flex-1">
                          <p className="text-sm text-neutral-500 mb-2">
                            Choose how you'd like to receive your payment when this item sells
                          </p>
                          <Select
                            disabled={
                              item?.status !== "sold" ||
                              item?.status === "paid" ||
                              updatePayoutMutation.isPending
                            }
                            value={payoutType || item?.pricing?.payoutType || "cash"}
                            onValueChange={setPayoutType}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select payout method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash Payout</SelectItem>
                              <SelectItem value="storeCredit">
                                Store Credit (+10% bonus)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <Button
                          disabled={
                            !payoutType ||
                            item?.status !== "sold" ||
                            item?.status === "paid" ||
                            payoutType === item?.pricing?.payoutType ||
                            updatePayoutMutation.isPending
                          }
                          onClick={handleUpdatePayoutType}
                        >
                          {updatePayoutMutation.isPending
                            ? "Updating..."
                            : "Update Preference"
                          }
                        </Button>
                      </div>
                      
                      {payoutType === "storeCredit" && (
                        <p className="text-sm text-green-600 mt-2">
                          +10% bonus: You'll receive €
                          {item?.pricing?.finalPayout
                            ? ((item.pricing.finalPayout * 1.1) / 100).toFixed(2)
                            : "0.00"
                          } in store credit
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status Timeline</CardTitle>
                    <CardDescription>
                      Track the progress of your item
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Status timeline - simplified version */}
                    <div className="relative pl-6 space-y-6 py-2">
                      <div className="absolute top-0 bottom-0 left-2 border-l-2 border-neutral-200"></div>
                      
                      {item?.statusHistory?.length ? (
                        item.statusHistory
                          .sort((a: any, b: any) => 
                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                          )
                          .map((statusItem: any, index: number) => (
                            <div key={index} className="relative">
                              <div className="absolute -left-6 top-0 flex items-center justify-center">
                                <div className={`w-4 h-4 rounded-full ${index === 0 ? 'bg-primary' : 'bg-neutral-300'}`}></div>
                              </div>
                              <div>
                                <p className="font-medium">
                                  {formatStatus(statusItem.status)}
                                </p>
                                <p className="text-sm text-neutral-500">
                                  {new Date(statusItem.createdAt).toLocaleDateString()} at {new Date(statusItem.createdAt).toLocaleTimeString()}
                                </p>
                                {statusItem.note && (
                                  <p className="text-sm mt-1 bg-neutral-50 p-2 rounded-md">
                                    {statusItem.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                      ) : (
                        <p className="text-neutral-500">No status updates available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="shipping" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Shipping Information</CardTitle>
                    <CardDescription>
                      Details about shipping and handling
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {item?.shipping ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-neutral-500">Shipping Provider</p>
                            <p className="font-medium">
                              {item.shipping.provider || "Not assigned"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-neutral-500">Tracking Number</p>
                            <p className="font-medium">
                              {item.shipping.trackingNumber || "Not available"}
                            </p>
                          </div>
                          {item.shipping.trackingUrl && (
                            <div className="md:col-span-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(item.shipping.trackingUrl, "_blank")}
                              >
                                Track Package
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <p className="text-sm text-neutral-500 mb-2">Shipping Address</p>
                          {item.shipping.shippingAddress ? (
                            <div className="text-sm">
                              <p>{item.shipping.shippingAddress.name}</p>
                              <p>{item.shipping.shippingAddress.streetAddress}</p>
                              <p>
                                {item.shipping.shippingAddress.postalCode}{" "}
                                {item.shipping.shippingAddress.city}
                              </p>
                              <p>{item.shipping.shippingAddress.country}</p>
                            </div>
                          ) : (
                            <p className="text-neutral-500">
                              No shipping address available yet
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-neutral-500">
                          Shipping information will be available once the item is ready to ship.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}