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
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-auto rounded-lg object-cover"
                />
              ) : (
                <div className="w-full h-64 bg-neutral-200 rounded-lg flex items-center justify-center text-neutral-500">
                  No image available
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
                <p className="text-sm text-neutral-500">ID: {item.referenceId}</p>
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
                  <h3 className="text-sm font-medium mb-2">Market Pricing</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-neutral-500">Average Market</p>
                      <p className="text-sm font-medium">
                        €{(item.pricing.averageMarketPrice / 100 || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Our Listing</p>
                      <p className="text-sm font-medium text-primary">
                        €{(item.pricing.suggestedListingPrice / 100 || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Consignor Payout ({100 - (item.pricing.commissionRate || 20)}%)</p>
                      <p className="text-sm font-medium">
                        €{(item.pricing.suggestedPayout / 100 || 0).toFixed(2)}
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
                <Button variant="outline" size="sm">
                  Update Status
                </Button>
                <Button className="flex items-center" size="sm">
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
