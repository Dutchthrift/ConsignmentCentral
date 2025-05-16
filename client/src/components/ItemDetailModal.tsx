import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2, Package, Clipboard, Tag, CalendarClock, CheckCircle2, CircleDashed, CircleAlert, 
  RefreshCcw, Truck, DollarSign, ShoppingBag, Ban, Timer 
} from "lucide-react";
import { format } from "date-fns";

// Helper function to format currency
const formatCurrency = (amount: number | undefined) => {
  if (amount === undefined || amount === null) return "€0,00";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount / 100);
};

// Helper function to determine status badge color
const getStatusColor = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/10",
    submitted: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/10",
    approved: "bg-green-500/10 text-green-500 hover:bg-green-500/10",
    analyzing: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/10",
    analyzed: "bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/10",
    rejected: "bg-red-500/10 text-red-500 hover:bg-red-500/10",
    pricing: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/10",
    priced: "bg-green-500/10 text-green-500 hover:bg-green-500/10",
    listed: "bg-teal-500/10 text-teal-500 hover:bg-teal-500/10",
    sold: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/10",
    shipped: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/10",
    completed: "bg-green-500/10 text-green-500 hover:bg-green-500/10",
    cancelled: "bg-red-500/10 text-red-500 hover:bg-red-500/10",
  };
  
  return statusMap[status] || "bg-gray-500/10 text-gray-500 hover:bg-gray-500/10";
};

// Helper function to get status icon
const StatusIcon = ({ status }: { status: string }) => {
  if (["completed", "approved", "priced", "sold"].includes(status)) {
    return <CheckCircle2 className="w-5 h-5 text-green-500" />;
  } else if (["rejected", "cancelled"].includes(status)) {
    return <CircleAlert className="w-5 h-5 text-red-500" />;
  } else {
    return <CircleDashed className="w-5 h-5 text-yellow-500" />;
  }
};

type ItemDetailModalProps = {
  referenceId: string | null;
  onClose: () => void;
  isAdmin?: boolean;
};

// Define available status options for the dropdown
const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "analyzing", label: "Analyzing" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "selling", label: "Selling" },
  { value: "sold", label: "Sold" },
  { value: "shipped", label: "Shipped" }
];

export default function ItemDetailModal({ referenceId, onClose, isAdmin = false }: ItemDetailModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOpen = !!referenceId;
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  
  // API endpoint depends on user role - use consignor endpoint for consignor and admin endpoint for admin
  const endpoint = isAdmin ? 
    `/api/admin/items/${referenceId}` : 
    `/api/items/${referenceId}`;
  
  // Fetch the item details
  const { data, isLoading, error, refetch } = useQuery<{success: boolean, data: any}>({
    queryKey: [endpoint],
    enabled: isOpen && !!referenceId,
    retry: 1
  });
  
  // Mutation for updating the item status
  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const updateEndpoint = `/api/items/${referenceId}/status`;
      return await apiRequest('PATCH', updateEndpoint, { status: newStatus });
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "The item status has been successfully updated.",
      });
      // Refetch the item details to show the updated status
      refetch();
      // Reset the selected status
      setSelectedStatus(undefined);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update status",
        description: error.message || "There was an error updating the item status.",
        variant: "destructive",
      });
    }
  });
  
  if (!isOpen) return null;
  
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading item details...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  if (error || !data || !data.success) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-red-500">Error Loading Item</DialogTitle>
            <DialogDescription>
              There was a problem loading the item details.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>Please try again later or contact support if the problem persists.</p>
            {data && (
              <pre className="mt-4 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            )}
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  // The API returns data in a nested structure - extract properly
  const itemData = data.data;
  const item = itemData?.item;
  const customer = itemData?.customer;
  const pricing = itemData?.pricing;
  const analysis = itemData?.analysis;
  
  // Debug the data structure to console
  console.log("API response:", data);
  
  // Safety check in case the item doesn't have all properties
  if (!item) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-amber-500">Item Data Format Issue</DialogTitle>
            <DialogDescription>
              The item data is not in the expected format.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>The system cannot display this item properly. This might be due to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>The item is newly created and not fully processed</li>
              <li>A mismatch between the API response and what the UI expects</li>
            </ul>
            <pre className="mt-4 p-2 bg-gray-100 rounded text-xs overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle className="text-2xl font-bold">{item.title}</DialogTitle>
              <DialogDescription className="flex items-center mt-1">
                <Package className="h-4 w-4 mr-1 text-muted-foreground" />
                Reference ID: {item.referenceId}
              </DialogDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={getStatusColor(item.status)}>
                <StatusIcon status={item.status} />
                <span className="ml-1 capitalize">{item.status.replace(/_/g, " ")}</span>
              </Badge>
              
              {/* Status change dropdown */}
              <div className="flex gap-2 items-center">
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Change status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  disabled={!selectedStatus || statusMutation.isPending}
                  onClick={() => selectedStatus && statusMutation.mutate(selectedStatus)}
                >
                  {statusMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4 mr-1" />
                  )}
                  Update
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-6 space-y-6">
          {/* Basic Item Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Item Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4 mr-2" />
                  Submitted: {format(new Date(item.createdAt), "MMMM dd, yyyy")}
                </div>
                
                {customer && (
                  <div className="flex items-center text-sm">
                    <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                    Consignor: <span className="font-medium ml-1">{customer.name}</span>
                  </div>
                )}
                
                {item.category && (
                  <div className="flex items-center text-sm">
                    <Clipboard className="h-4 w-4 mr-2 text-muted-foreground" />
                    Category: <span className="font-medium ml-1">{item.category}</span>
                  </div>
                )}
                
                {item.condition && (
                  <div className="flex items-center text-sm">
                    <span className="font-medium mr-1">Condition:</span> {item.condition}
                  </div>
                )}
              </div>
              
              {/* Image if available */}
              <div className="flex justify-center">
                {item.imageUrl ? (
                  <img 
                    src={item.imageUrl} 
                    alt={item.title} 
                    className="rounded-md object-cover max-h-[150px]" 
                  />
                ) : (
                  <div className="flex items-center justify-center bg-muted rounded-md w-full h-[150px]">
                    <span className="text-muted-foreground text-sm">No image available</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Description if available */}
            {item.description && (
              <div className="bg-muted/30 p-4 rounded-md mt-4">
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            )}
            
            {/* Analysis section if available */}
            {analysis && (
              <div className="bg-blue-50 p-4 rounded-md mt-4 border border-blue-100">
                <h4 className="text-sm font-medium mb-1 text-blue-900">Item Analysis</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {analysis.brand && (
                    <div className="text-sm">
                      <span className="font-medium">Brand:</span> {analysis.brand}
                    </div>
                  )}
                  
                  {analysis.model && (
                    <div className="text-sm">
                      <span className="font-medium">Model:</span> {analysis.model}
                    </div>
                  )}
                  
                  {analysis.category && (
                    <div className="text-sm">
                      <span className="font-medium">Category:</span> {analysis.category}
                    </div>
                  )}
                  
                  {analysis.condition && (
                    <div className="text-sm">
                      <span className="font-medium">Condition:</span> {analysis.condition}
                    </div>
                  )}
                </div>
                
                {analysis.features && analysis.features.length > 0 && (
                  <div className="mt-2">
                    <span className="text-sm font-medium">Features:</span>
                    <ul className="list-disc pl-5 mt-1 text-sm">
                      {analysis.features.map((feature, idx) => (
                        <li key={idx}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {/* Pricing section if available */}
            {pricing && (
              <div className="bg-green-50 p-4 rounded-md mt-4 border border-green-100">
                <h4 className="text-sm font-medium mb-1 text-green-900">Pricing Details</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {pricing.suggestedListingPrice !== undefined && (
                    <div className="text-sm">
                      <span className="font-medium">Suggested Price:</span> {formatCurrency(pricing.suggestedListingPrice)}
                    </div>
                  )}
                  
                  {pricing.commissionRate !== undefined && (
                    <div className="text-sm">
                      <span className="font-medium">Commission Rate:</span> {pricing.commissionRate}%
                    </div>
                  )}
                  
                  {pricing.finalPayout !== undefined && (
                    <div className="text-sm">
                      <span className="font-medium">Estimated Payout:</span> {formatCurrency(pricing.finalPayout)}
                    </div>
                  )}
                  
                  {pricing.payoutType && (
                    <div className="text-sm">
                      <span className="font-medium">Payout Type:</span> {pricing.payoutType}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Additional item info if available */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {item.sku && (
                <div className="p-3 bg-muted/20 rounded-md">
                  <h4 className="text-sm font-medium">SKU</h4>
                  <p className="text-sm font-mono">{item.sku}</p>
                </div>
              )}
              
              {item.serialNumber && (
                <div className="p-3 bg-muted/20 rounded-md">
                  <h4 className="text-sm font-medium">Serial Number</h4>
                  <p className="text-sm font-mono">{item.serialNumber}</p>
                </div>
              )}
            </div>
          </div>
          
          <Separator />
          
          {/* Analysis Section */}
          {item.analysis && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Product Analysis</h3>
              
              <div className="bg-blue-50/50 p-4 rounded-md space-y-2">
                {item.analysis.productType && (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-muted-foreground">Product Type:</span>
                    <span className="col-span-2 font-medium">{item.analysis.productType}</span>
                  </div>
                )}
                
                {item.analysis.authenticityAssessment && (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-muted-foreground">Authenticity:</span>
                    <span className="col-span-2 font-medium">{item.analysis.authenticityAssessment}</span>
                  </div>
                )}
                
                {item.analysis.features && (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-muted-foreground">Features:</span>
                    <span className="col-span-2">{item.analysis.features}</span>
                  </div>
                )}
                
                {/* Only show accessories section if it exists */}
                {item.analysis.accessories && item.analysis.accessories.trim() !== "" && (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-muted-foreground">Accessories:</span>
                    <span className="col-span-2">{item.analysis.accessories}</span>
                  </div>
                )}
                
                {item.analysis.notes && (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-muted-foreground">Analysis Notes:</span>
                    <span className="col-span-2">{item.analysis.notes}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Pricing Section */}
          {item.pricing && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pricing Information</h3>
                
                <div className="bg-green-50/50 p-4 rounded-md space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {item.pricing.marketComps && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">Market Comparisons</h4>
                        <p className="text-sm text-muted-foreground">{item.pricing.marketComps}</p>
                      </div>
                    )}
                    
                    {item.pricing.averageMarketPrice !== null && item.pricing.averageMarketPrice !== undefined && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">Average Market Price</h4>
                        <p className="text-base font-semibold">{formatCurrency(item.pricing.averageMarketPrice)}</p>
                      </div>
                    )}
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {item.pricing.suggestedListingPrice !== null && item.pricing.suggestedListingPrice !== undefined && (
                      <div className="bg-white p-3 rounded-md text-center">
                        <h4 className="text-sm text-muted-foreground">Listing Price</h4>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(item.pricing.suggestedListingPrice)}</p>
                      </div>
                    )}
                    
                    {item.pricing.commissionRate !== null && item.pricing.commissionRate !== undefined && (
                      <div className="bg-white p-3 rounded-md text-center">
                        <h4 className="text-sm text-muted-foreground">Commission</h4>
                        <p className="text-lg font-bold">{item.pricing.commissionRate}%</p>
                      </div>
                    )}
                    
                    {item.pricing.estimatedPayout !== null && item.pricing.estimatedPayout !== undefined && (
                      <div className="bg-white p-3 rounded-md text-center">
                        <h4 className="text-sm text-muted-foreground">Your Payout</h4>
                        <p className="text-lg font-bold text-blue-600">{formatCurrency(item.pricing.estimatedPayout)}</p>
                        {item.pricing.payoutBonus && (
                          <Badge variant="outline" className="mt-1">+10% Store Credit Bonus</Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {item.pricing.pricingNotes && (
                    <div className="mt-3 text-sm">
                      <span className="font-medium">Notes: </span>
                      <span className="text-muted-foreground">{item.pricing.pricingNotes}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          
          {/* Shipping Section */}
          {item.shipping && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Shipping Information</h3>
                
                <div className="bg-purple-50/50 p-4 rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {item.shipping.carrier && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">Shipping Carrier</h4>
                        <p className="text-muted-foreground">{item.shipping.carrier}</p>
                      </div>
                    )}
                    
                    {item.shipping.trackingNumber && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">Tracking Number</h4>
                        <p className="font-mono">{item.shipping.trackingNumber}</p>
                      </div>
                    )}
                  </div>
                  
                  {item.shipping.shippedAt && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium">Shipped Date</h4>
                      <p>{format(new Date(item.shipping.shippedAt), "MMMM dd, yyyy")}</p>
                    </div>
                  )}
                  
                  {item.shipping.shippingNotes && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium">Shipping Notes</h4>
                      <p className="text-sm text-muted-foreground">{item.shipping.shippingNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter className="border-t pt-4">
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}