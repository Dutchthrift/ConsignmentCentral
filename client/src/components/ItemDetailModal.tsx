import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface ItemDetailModalProps {
  referenceId: string;
  onClose: () => void;
}

export default function ItemDetailModal({ referenceId, onClose }: ItemDetailModalProps) {
  // Fetch item details
  const { data, isLoading, error } = useQuery<any>({
    queryKey: [`/api/items/${referenceId}`],
  });

  const item = data?.data;

  // Format status for display
  const formatStatus = (status: string) => {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "PPP 'at' p");
    } catch (error) {
      return dateString;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    if (!status) {
      return (
        <Badge
          variant="outline"
          className="bg-gray-100 text-gray-800"
        >
          Unknown
        </Badge>
      );
    }
    
    const statusColors: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800",
      analyzed: "bg-green-100 text-green-800",
      shipped: "bg-blue-100 text-blue-800",
      received: "bg-cyan-100 text-cyan-800",
      listed: "bg-blue-100 text-blue-800",
      sold: "bg-purple-100 text-purple-800",
      paid: "bg-emerald-100 text-emerald-800",
    };

    return (
      <Badge
        variant="outline"
        className={`${statusColors[status] || "bg-gray-100 text-gray-800"}`}
      >
        {formatStatus(status)}
      </Badge>
    );
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium">Item Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <Skeleton className="h-64 w-full rounded-lg" />
              </div>
              <div className="md:col-span-2 space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">Error loading item details</p>
            <Button variant="outline" onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        ) : item ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              {item.item && item.item.imageUrl ? (
                <img
                  src={item.item.imageUrl}
                  alt={item.item.title}
                  className="w-full h-auto rounded-lg object-cover"
                />
              ) : (
                <div className="w-full h-64 bg-neutral-200 rounded-lg flex items-center justify-center text-neutral-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm ml-2">No image available</p>
                </div>
              )}

              <div className="mt-4 space-y-2">
                <div className="rounded-lg border border-neutral-200 p-4">
                  <h3 className="text-sm font-medium mb-2">Customer Information</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-neutral-500">Name:</span> {item.customer.name}
                    </p>
                    <p>
                      <span className="text-neutral-500">Email:</span> {item.customer.email}
                    </p>
                    {item.customer.phone && (
                      <p>
                        <span className="text-neutral-500">Phone:</span> {item.customer.phone}
                      </p>
                    )}
                  </div>
                </div>

                {item.shipping && (
                  <div className="rounded-lg border border-neutral-200 p-4">
                    <h3 className="text-sm font-medium mb-2">Shipping Label</h3>
                    <p className="text-sm text-neutral-600 mb-2">
                      Label generated on {formatDate(item.shipping.createdAt)}
                    </p>
                    <Button
                      className="flex items-center justify-center w-full"
                      size="sm"
                      onClick={() => window.open(item.shipping.labelUrl, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-1" /> Download Label
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div>
                <div className="flex justify-between">
                  <h3 className="text-lg font-medium">{item.title}</h3>
                  {getStatusBadge(item.status)}
                </div>
                <div className="flex items-center mt-1">
                  <span className="text-sm font-medium mr-2">ID:</span>
                  <Badge variant="outline" className="bg-neutral-100 font-mono text-black">
                    {item.referenceId || "Unknown"}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-2">Product Description</h3>
                <p className="text-sm text-neutral-600">{item.description || "No description provided"}</p>
              </div>

              {item.analysis && (
                <div>
                  <Separator />
                  <h3 className="text-sm font-medium mb-2">AI Analysis Results</h3>
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                      <p className="text-xs text-neutral-500">Product Type</p>
                      <p className="text-sm font-medium">{item.analysis.productType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Brand</p>
                      <p className="text-sm font-medium">{item.analysis.brand}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Model</p>
                      <p className="text-sm font-medium">{item.analysis.model}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Condition</p>
                      <p className="text-sm font-medium">{item.analysis.condition}</p>
                    </div>
                  </div>

                  {item.analysis.accessories && item.analysis.accessories.length > 0 && (
                    <>
                      <h4 className="text-xs font-medium mt-3 mb-2">Included Accessories</h4>
                      <div className="flex flex-wrap gap-2">
                        {item.analysis.accessories.map((accessory: string, index: number) => (
                          <Badge key={index} variant="outline" className="bg-neutral-100 text-neutral-800">
                            {accessory}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}

                  {item.analysis.additionalNotes && (
                    <div className="mt-2">
                      <h4 className="text-xs font-medium mb-1">Additional Notes</h4>
                      <p className="text-xs text-neutral-600">{item.analysis.additionalNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {item.pricing && (
                <div>
                  <Separator />
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium">Market Pricing</h3>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      eBay Market Data
                    </Badge>
                  </div>
                  
                  <div className="bg-blue-50/40 rounded-lg p-3 mb-3">
                    <div className="flex justify-between">
                      <span className="text-xs font-medium">Average Market Price:</span>
                      <span className="text-sm font-bold">
                        €{(item.pricing.estimatedSalePrice || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-primary/10 rounded-lg p-3">
                      <p className="text-xs font-medium text-primary-700 mb-1">Our Listing Price</p>
                      <p className="text-lg font-bold text-primary">
                        €{(item.pricing.estimatedSalePrice || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-yellow-800 mb-1">
                        Consignor Payout <span className="text-yellow-600">({100 - (item.pricing.commissionRate || 35)}%)</span>
                      </p>
                      <p className="text-lg font-bold text-yellow-700">
                        €{(item.pricing.yourPayout || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Separator />
                <h3 className="text-sm font-medium mb-2">Timeline</h3>
                <ol className="relative border-l border-neutral-200 ml-3 space-y-2">
                  <li className="mb-4 ml-6">
                    <span className="absolute flex items-center justify-center w-6 h-6 bg-primary rounded-full -left-3">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white h-3 w-3">
                        <path d="M5 8h14M5 8a2 2 0 100-4 2 2 0 000 4z" />
                        <path d="M17 16H9a4 4 0 00-4 4" />
                        <circle cx="9" cy="10" r="2" />
                      </svg>
                    </span>
                    <h4 className="flex items-center text-sm font-medium">Intake Submitted</h4>
                    <p className="text-xs text-neutral-500">{formatDate(item.createdAt)}</p>
                  </li>

                  {item.analysis && (
                    <li className="mb-4 ml-6">
                      <span className="absolute flex items-center justify-center w-6 h-6 bg-primary rounded-full -left-3">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white h-3 w-3">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4M12 8h.01" />
                        </svg>
                      </span>
                      <h4 className="flex items-center text-sm font-medium">AI Analysis Completed</h4>
                      <p className="text-xs text-neutral-500">{formatDate(item.analysis.createdAt)}</p>
                    </li>
                  )}

                  {item.shipping && (
                    <li className="mb-4 ml-6">
                      <span className="absolute flex items-center justify-center w-6 h-6 bg-primary rounded-full -left-3">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white h-3 w-3">
                          <rect width="16" height="13" x="4" y="5" rx="2" />
                          <path d="M16 2v4M8 2v4M3 10h19" />
                        </svg>
                      </span>
                      <h4 className="flex items-center text-sm font-medium">Shipping Label Generated</h4>
                      <p className="text-xs text-neutral-500">{formatDate(item.shipping.createdAt)}</p>
                    </li>
                  )}

                  {item.status !== "sold" && item.status !== "paid" && (
                    <li className="ml-6">
                      <span className="absolute flex items-center justify-center w-6 h-6 bg-neutral-200 rounded-full -left-3">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500 h-3 w-3">
                          <circle cx="8" cy="21" r="1" />
                          <circle cx="19" cy="21" r="1" />
                          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 002 1.58h9.78a2 2 0 001.95-1.57l1.65-7.43H5.12" />
                        </svg>
                      </span>
                      <h4 className="flex items-center text-sm font-medium text-neutral-500">
                        {item.status === "listed"
                          ? "Awaiting Sale"
                          : "Awaiting Next Step"}
                      </h4>
                      <p className="text-xs text-neutral-500">Pending</p>
                    </li>
                  )}

                  {(item.status === "sold" || item.status === "paid") && (
                    <li className="ml-6">
                      <span className="absolute flex items-center justify-center w-6 h-6 bg-purple-500 rounded-full -left-3">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white h-3 w-3">
                          <circle cx="8" cy="21" r="1" />
                          <circle cx="19" cy="21" r="1" />
                          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 002 1.58h9.78a2 2 0 001.95-1.57l1.65-7.43H5.12" />
                        </svg>
                      </span>
                      <h4 className="flex items-center text-sm font-medium">Item Sold</h4>
                      <p className="text-xs text-neutral-500">
                        {item.status === "paid"
                          ? "Payment Complete"
                          : "Awaiting Payout"}
                      </p>
                    </li>
                  )}
                </ol>
              </div>

              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Create a dropdown or dialog for status selection in a real implementation
                    alert("Status update functionality would open a dropdown or dialog here");
                  }}
                  className="border-amber-500 text-amber-600 hover:bg-amber-50"
                >
                  Update Status
                </Button>
                <Button 
                  className="flex items-center bg-[#96bf48] hover:bg-[#7aa93c]" 
                  size="sm"
                  onClick={() => {
                    // In a real implementation, this would link to the Shopify product
                    window.open(`https://admin.shopify.com/store/dutchthrift/products`, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-1" /> View in Shopify
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p>No item found with ID: {referenceId}</p>
            <Button variant="outline" onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
