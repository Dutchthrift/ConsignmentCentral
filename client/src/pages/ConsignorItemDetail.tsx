import React from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ChevronLeft, Package, Clipboard, Tag, CalendarClock, CheckCircle2, CircleDashed, CircleAlert } from "lucide-react";

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(amount / 100);
};

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

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

export default function ConsignorItemDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Fetch the item details
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/consignor/item/${id}`],
    enabled: !!id && !!user
  });

  // Handle back button click
  const handleBack = () => {
    navigate("/consignor/items");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading item details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to My Items
        </Button>
        
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-red-500">Error Loading Item</CardTitle>
            <CardDescription>
              There was a problem loading the item details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Please try again later or contact support if the problem persists.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleBack}>
              Return to Item List
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!data || !data.success) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to My Items
        </Button>
        
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-red-500">Item Not Found</CardTitle>
            <CardDescription>
              The item you're looking for doesn't exist or you don't have permission to view it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Please check the item reference ID and try again.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleBack}>
              Return to Item List
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const item = data.data;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to My Items
        </Button>
      </div>

      <Card className="max-w-4xl mx-auto shadow-md">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold">{item.title}</CardTitle>
              <CardDescription className="flex items-center mt-1">
                <Package className="h-4 w-4 mr-1 text-muted-foreground" />
                Reference ID: {item.referenceId}
              </CardDescription>
            </div>
            <Badge className={getStatusColor(item.status)}>
              <StatusIcon status={item.status} />
              <span className="ml-1 capitalize">{item.status.replace(/_/g, " ")}</span>
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Basic Item Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Item Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4 mr-2" />
                  Submitted: {format(new Date(item.createdAt), "MMMM dd, yyyy")}
                </div>
                
                {item.brand && (
                  <div className="flex items-center text-sm">
                    <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                    Brand: <span className="font-medium ml-1">{item.brand}</span>
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
                
                {item.analysis.accessories && (
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
          
          <Separator />
          
          {/* Pricing Section */}
          {item.pricing && (
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
        </CardContent>
        
        <CardFooter className="bg-muted/20 flex justify-between items-center border-t">
          <div className="text-sm text-muted-foreground">
            Last updated: {format(new Date(item.updatedAt), "MMMM dd, yyyy")}
          </div>
          
          <Button variant="outline" onClick={handleBack}>
            Back to Items
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}