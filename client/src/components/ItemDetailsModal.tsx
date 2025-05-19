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

// This interface matches exactly what the API returns
interface ItemDetail {
  id: number;
  referenceId: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  customer: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
  };
  analysis: {
    id: number;
    itemId: number;
    materialAnalysis: string | null;
    brandAnalysis: string | null;
    styleAnalysis: string | null;
    authenticityScore: number | null;
    conditionScore: number | null;
    notes: string | null;
    createdAt: string;
  } | null;
  pricing: {
    id: number;
    itemId: number;
    suggestedPrice: number | null;
    estimatedValue: number | null;
    listPrice: number | null;
    consignmentRate: number | null;
    consignorPayout: number | null;
    notes: string | null;
    createdAt: string;
  } | null;
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
        console.log("Raw API response:", data); // Log the response for debugging
        
        // If we get raw JSON that's not properly structured, fix it
        if (data.success && data.data) {
          try {
            // Handle potential error where the data is returned as a string
            if (typeof data.data === 'string') {
              try {
                return JSON.parse(data.data);
              } catch (parseErr) {
                console.error("Error parsing item data string:", parseErr);
                return data.data;
              }
            }
            return data.data;
          } catch (jsonErr) {
            console.error("JSON parsing error:", jsonErr);
          }
        }
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
  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null) return "N/A";
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value / 100); // Convert cents to euros for display
  };

  // Guard against errors in rendering
  if (error) {
    console.error("Render error:", error);
  }

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
                        <dt className="text-sm font-medium text-muted-foreground">Reference ID</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.referenceId || "N/A"}</dd>
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
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="analysis" className="space-y-4">
              {item.analysis ? (
                <Card>
                  <CardContent className="pt-6">
                    <dl className="divide-y">
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Material Analysis</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.analysis.materialAnalysis || "N/A"}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Brand Analysis</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.analysis.brandAnalysis || "N/A"}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Style Analysis</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.analysis.styleAnalysis || "N/A"}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Authenticity Score</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">
                          {item.analysis.authenticityScore !== null 
                            ? `${item.analysis.authenticityScore}/100` 
                            : "N/A"}
                        </dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Condition Score</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">
                          {item.analysis.conditionScore !== null 
                            ? `${item.analysis.conditionScore}/100` 
                            : "N/A"}
                        </dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Analysis Date</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{formatDate(item.analysis.createdAt)}</dd>
                      </div>
                    </dl>
                    
                    {item.analysis.notes && (
                      <div className="mt-4">
                        <Separator className="mb-4" />
                        <h3 className="text-sm font-medium mb-2">Analysis Notes</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {item.analysis.notes}
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
                        <dt className="text-sm font-medium text-muted-foreground">Average Market Price</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{formatCurrency(item.pricing.estimatedValue)}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Suggested Listing Price</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{formatCurrency(item.pricing.suggestedPrice)}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Final List Price</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{formatCurrency(item.pricing.listPrice)}</dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Commission Rate</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">
                          {item.pricing.consignmentRate !== null ? `${item.pricing.consignmentRate}%` : "N/A"}
                        </dd>
                      </div>
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Consignor Payout</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{formatCurrency(item.pricing.consignorPayout)}</dd>
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
                      <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.customer.name || "N/A"}</dd>
                    </div>
                    <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                      <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                      <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.customer.email || "N/A"}</dd>
                    </div>
                    {item.customer.phone && (
                      <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                        <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{item.customer.phone}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            Item not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}