import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ItemDetailsProps {
  referenceId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ItemDetail {
  id: number;
  referenceId: string;
  title: string;
  description: string;
  brand?: string;
  category?: string;
  condition?: string;
  status: string;
  createdAt: string;
  customer: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  analysis?: {
    id: number;
    itemId: number;
    productType?: string;
    material?: string;
    color?: string;
    size?: string;
    condition?: string;
    details?: string;
    authenticity?: string;
    createdAt: string;
  };
  pricing?: {
    id: number;
    itemId: number;
    estimatedValue?: number;
    suggestedPrice?: number;
    listPrice?: number;
    consignmentRate?: number;
    consignorPayout?: number;
    platform?: string;
    notes?: string;
    createdAt: string;
  };
  images?: string[];
}

export default function ItemDetailsModal({ referenceId, isOpen, onClose }: ItemDetailsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");
  
  // Reset active tab when a new item is selected
  useEffect(() => {
    if (isOpen) {
      setActiveTab("details");
    }
  }, [referenceId, isOpen]);

  const { data: item, isLoading, error } = useQuery<ItemDetail>({
    queryKey: [`/api/items/${referenceId}`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/items/${referenceId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch item: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.data;
      } catch (err) {
        console.error(`Error fetching item ${referenceId}:`, err);
        toast({
          variant: "destructive",
          title: "Error loading item details",
          description: "Could not load the item details. Please try again later."
        });
        throw err;
      }
    },
    enabled: isOpen && !!referenceId,
    retry: 1
  });

  // Get status badge color based on the item status
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      received: { variant: "secondary", label: "Received" },
      analyzing: { variant: "outline", label: "Analyzing" },
      pricing: { variant: "outline", label: "Pricing" },
      approved: { variant: "default", label: "Approved" },
      listed: { variant: "default", label: "Listed" },
      sold: { variant: "default", label: "Sold" },
      rejected: { variant: "destructive", label: "Rejected" },
      returned: { variant: "outline", label: "Returned" }
    };
    
    const config = statusMap[status.toLowerCase()] || { variant: "outline", label: status };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format currency
  const formatCurrency = (value?: number) => {
    if (value === undefined) return "N/A";
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-semibold">
              {isLoading ? "Loading Item Details..." : item?.title || "Item Details"}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 mt-1">
              <span>Reference: {referenceId}</span>
              {item && getStatusBadge(item.status)}
            </DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex h-48 w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center p-4 text-destructive">
            Error loading item details. Please try again.
          </div>
        ) : item ? (
          <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="consignor">Consignor</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <dl className="divide-y">
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Title</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.title || "N/A"}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Brand</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.brand || "N/A"}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Category</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.category || "N/A"}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Condition</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.condition || "N/A"}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{getStatusBadge(item.status)}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Submitted</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{formatDate(item.createdAt)}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {item.description || "No description provided."}
                  </p>
                  
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Item Images</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {item.images && item.images.length > 0 ? (
                        item.images.map((img, index) => (
                          <img 
                            key={index}
                            src={img} 
                            alt={`${item.title} - image ${index + 1}`}
                            className="h-32 w-full object-cover rounded-md"
                          />
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground h-32 flex items-center justify-center border rounded-md">
                          No images available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="analysis" className="space-y-4">
              {item.analysis ? (
                <Card>
                  <CardContent className="pt-6">
                    <dl className="divide-y">
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Product Type</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.analysis.productType || "N/A"}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Material</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.analysis.material || "N/A"}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Color</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.analysis.color || "N/A"}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Size</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.analysis.size || "N/A"}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Condition</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.analysis.condition || "N/A"}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Authenticity</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.analysis.authenticity || "N/A"}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Analysis Date</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{formatDate(item.analysis.createdAt)}</dd>
                      </div>
                    </dl>
                    
                    {item.analysis.details && (
                      <div className="mt-4">
                        <Separator className="mb-4" />
                        <h3 className="text-sm font-medium mb-2">Additional Details</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {item.analysis.details}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  No analysis data available for this item.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="pricing" className="space-y-4">
              {item.pricing ? (
                <Card>
                  <CardContent className="pt-6">
                    <dl className="divide-y">
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Estimated Value</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{formatCurrency(item.pricing.estimatedValue)}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Suggested Price</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{formatCurrency(item.pricing.suggestedPrice)}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">List Price</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{formatCurrency(item.pricing.listPrice)}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Consignment Rate</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">
                          {item.pricing.consignmentRate ? `${item.pricing.consignmentRate}%` : "N/A"}
                        </dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Consignor Payout</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{formatCurrency(item.pricing.consignorPayout)}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Selling Platform</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.pricing.platform || "N/A"}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Pricing Date</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{formatDate(item.pricing.createdAt)}</dd>
                      </div>
                    </dl>
                    
                    {item.pricing.notes && (
                      <div className="mt-4">
                        <Separator className="mb-4" />
                        <h3 className="text-sm font-medium mb-2">Pricing Notes</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {item.pricing.notes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  No pricing data available for this item.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="consignor" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <dl className="divide-y">
                    <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                      <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                      <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.customer.name}</dd>
                    </div>
                    <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                      <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                      <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.customer.email}</dd>
                    </div>
                    <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                      <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                      <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.customer.phone || "N/A"}</dd>
                    </div>
                    <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                      <dt className="text-sm font-medium text-muted-foreground">Customer ID</dt>
                      <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.customer.id}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}