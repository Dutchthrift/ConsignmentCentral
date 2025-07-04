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
const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return "-";
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
};

// Helper function to format date
const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "PPP");
  } catch (e) {
    return dateString;
  }
};

// Helper function to get status badge
const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-neutral-100">Pending</Badge>;
    case "received":
      return <Badge variant="outline" className="bg-indigo-100 text-indigo-800">Received</Badge>;
    case "analyzing":
      return <Badge variant="outline" className="bg-purple-100 text-purple-800">Analyzing</Badge>;
    case "pricing":
      return <Badge variant="outline" className="bg-blue-100 text-blue-800">Pricing</Badge>;
    case "approved":
      return <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>;
    case "listed":
      return <Badge variant="outline" className="bg-emerald-100 text-emerald-800">Listed</Badge>;
    case "sold":
      return <Badge variant="outline" className="bg-amber-100 text-amber-800">Sold</Badge>;
    case "paid":
      return <Badge variant="outline" className="bg-green-100 text-green-800">Paid</Badge>;
    case "rejected":
      return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Helper function to get status icon
const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":
      return <CircleDashed className="h-5 w-5 text-neutral-500" />;
    case "received":
      return <Truck className="h-5 w-5 text-indigo-500" />;
    case "analyzing":
      return <Timer className="h-5 w-5 text-purple-500" />;
    case "pricing":
      return <DollarSign className="h-5 w-5 text-blue-500" />;
    case "approved":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "listed":
      return <ShoppingBag className="h-5 w-5 text-emerald-500" />;
    case "sold":
      return <CheckCircle2 className="h-5 w-5 text-amber-500" />;
    case "paid":
      return <DollarSign className="h-5 w-5 text-green-500" />;
    case "rejected":
      return <Ban className="h-5 w-5 text-red-500" />;
    default:
      return <CircleAlert className="h-5 w-5 text-muted-foreground" />;
  }
};

interface ItemDetailModalProps {
  referenceId: string;
  onClose?: () => void;
}

interface ItemDetail {
  id: number;
  referenceId: string;
  title: string;
  description?: string;
  status: string;
  brand?: string;
  category?: string;
  condition?: string;
  createdAt: string;
  updatedAt?: string | null;
  customerId: number;
  customerName?: string;
  customerEmail?: string;
  images?: string[];
  
  // Analysis data
  analysis?: {
    id: number;
    itemId: number;
    productType?: string | null;
    notes?: string | null;
    condition?: string | null;
    authenticity?: string | null;
    metadata?: Record<string, any> | null;
    createdAt?: string;
  } | null;
  
  // Pricing data 
  pricing?: {
    id?: number;
    itemId?: number;
    averageMarketPrice?: number | null;
    suggestedListingPrice?: number | null;
    commissionRate?: number | null;
    payoutAmount?: number | null;
    storeCredit?: boolean | null;
    storeCreditAmount?: number | null;
    suggestedPrice?: number | null;
    estimatedValue?: number | null;
    listPrice?: number | null;
    consignmentRate?: number | null;
    consignorPayout?: number | null;
    notes?: string | null;
    createdAt?: string;
    finalPayout?: number | null;
    payoutType?: string | null;
    finalSalePrice?: number | null;
  } | null;
}

export default function ItemDetailModal({ referenceId, onClose }: ItemDetailModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statusUpdate, setStatusUpdate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(true);

  // Fetch item details
  const { data: item, isLoading, error } = useQuery<{success: boolean, data: ItemDetail}>({
    queryKey: [`/api/items/${referenceId}`],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/items/${referenceId}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch item: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Raw item data:", data); // For debugging
        
        // Make sure we're returning the expected format
        if (!data.success || !data.data) {
          throw new Error("Invalid response format");
        }

        return data;
      } catch (err) {
        console.error(`Error fetching item ${referenceId}:`, err);
        toast({
          variant: "destructive",
          title: "Error loading item",
          description: "Could not load item details. Please try again."
        });
        throw err;
      }
    },
    enabled: !!referenceId && !!user?.id,
  });

  // Get the details from the response
  const itemDetails = item?.data;

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const response = await apiRequest("PATCH", `/api/items/${referenceId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "The item status has been updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${referenceId}`] });
      setStatusUpdate(null);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: "Could not update the item status. Please try again.",
        variant: "destructive",
      });
      console.error("Status update error:", error);
    }
  });

  const handleClose = () => {
    setIsModalOpen(false);
    if (onClose) onClose();
  };

  const handleStatusChange = (value: string) => {
    setStatusUpdate(value);
  };

  const submitStatusUpdate = () => {
    if (statusUpdate) {
      updateStatusMutation.mutate({ status: statusUpdate });
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {itemDetails?.status && getStatusIcon(itemDetails.status)}
            <span>{itemDetails?.title || 'Item Details'}</span>
            {itemDetails?.status && getStatusBadge(itemDetails.status)}
          </DialogTitle>
          <DialogDescription>
            Reference ID: {referenceId}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <CircleAlert className="h-10 w-10 mx-auto mb-2" />
            <p className="font-medium">Failed to load item details</p>
            <p className="text-sm text-muted-foreground mt-1">
              Please try again later or contact support if the issue persists.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info Card */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Item Information
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Title</p>
                    <p>{itemDetails?.title || '-'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-sm">{itemDetails?.description || '-'}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Brand</p>
                      <p>{itemDetails?.brand || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Category</p>
                      <p>{itemDetails?.category || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Condition</p>
                      <p>{itemDetails?.condition || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Date Added</p>
                      <p>{formatDate(itemDetails?.createdAt)}</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Analysis Info */}
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <Clipboard className="h-5 w-5" />
                  Analysis Details
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Product Type</p>
                    <p>{itemDetails?.analysis?.productType || '-'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Condition Assessment</p>
                    <p>{itemDetails?.analysis?.condition || '-'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Authenticity</p>
                    <p>{itemDetails?.analysis?.authenticity || '-'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Analysis Notes</p>
                    <p className="text-sm">{itemDetails?.analysis?.notes || '-'}</p>
                  </div>
                </div>
              </div>
              
              {/* Pricing Info Card */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Pricing Information
                </h3>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Market Price</p>
                      <p>{formatCurrency(itemDetails?.pricing?.averageMarketPrice || itemDetails?.pricing?.estimatedValue)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Listing Price</p>
                      <p>{formatCurrency(itemDetails?.pricing?.suggestedListingPrice || itemDetails?.pricing?.listPrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Commission Rate</p>
                      <p>{itemDetails?.pricing?.commissionRate || itemDetails?.pricing?.consignmentRate || '-'}%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Estimated Payout</p>
                      <p>{formatCurrency(itemDetails?.pricing?.payoutAmount || itemDetails?.pricing?.consignorPayout)}</p>
                    </div>
                    {itemDetails?.status === 'sold' && (
                      <>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Final Sale Price</p>
                          <p>{formatCurrency(itemDetails?.pricing?.finalSalePrice)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Final Payout</p>
                          <p>{formatCurrency(itemDetails?.pricing?.finalPayout)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Payout Type</p>
                          <p>{itemDetails?.pricing?.payoutType || 'Cash'}</p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pricing Notes</p>
                    <p className="text-sm">{itemDetails?.pricing?.notes || '-'}</p>
                  </div>
                </div>
                
                <Separator />
                
                {/* Timeline and Status */}
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <CalendarClock className="h-5 w-5" />
                  Status Timeline
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Current Status</p>
                      <div className="flex items-center gap-2 mt-1">
                        {itemDetails?.status && getStatusBadge(itemDetails.status)}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status Updated</p>
                      <p>{formatDate(itemDetails?.updatedAt || itemDetails?.createdAt)}</p>
                    </div>
                  </div>
                  
                  {user?.role === 'admin' && (
                    <div className="flex flex-col space-y-2 pt-2">
                      <p className="text-sm font-medium text-muted-foreground">Update Status</p>
                      <div className="flex gap-2">
                        <Select value={statusUpdate || ''} onValueChange={handleStatusChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a new status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="received">Received</SelectItem>
                            <SelectItem value="analyzing">Analyzing</SelectItem>
                            <SelectItem value="pricing">Pricing</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="listed">Listed</SelectItem>
                            <SelectItem value="sold">Sold</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={submitStatusUpdate}
                          disabled={!statusUpdate || updateStatusMutation.isPending}
                        >
                          {updateStatusMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <RefreshCcw className="mr-2 h-4 w-4" />
                              Update
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Images Section */}
            {itemDetails?.images && itemDetails.images.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-lg mb-3">Images</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {itemDetails.images.map((img, idx) => (
                    <div key={idx} className="aspect-square rounded-md overflow-hidden">
                      <img 
                        src={img} 
                        alt={`${itemDetails.title} - image ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}