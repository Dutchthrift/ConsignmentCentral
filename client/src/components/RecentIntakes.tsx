import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

// Define types for the component
type Item = {
  id: number;
  referenceId: string;
  title: string;
  imageUrl?: string;
  status: string;
  createdAt: string;
  estimatedPrice?: number;
  commissionRate?: number;
  payoutAmount?: number;
  payoutType?: string;
  finalSalePrice?: number;
};

type RecentIntakesProps = {
  items?: Item[];
  isLoading: boolean;
  onItemClick: (referenceId: string) => void;
  customerId?: string;
};

export default function RecentIntakes({
  items = [],
  isLoading,
  onItemClick,
  customerId
}: RecentIntakesProps) {
  // For pagination if there are many items
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  
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
  
  // Format status for display
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
  
  // Calculate total pages for pagination
  const totalPages = Math.ceil(items.length / itemsPerPage);
  
  // Get the current page items
  const currentItems = items.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Items</CardTitle>
        <CardDescription>
          A list of your consigned items and their current status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          // Loading state
          <div className="space-y-4">
            {Array(3)
              .fill(0)
              .map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
          </div>
        ) : items.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="rounded-full bg-neutral-100 p-3 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-neutral-500"
              >
                <rect width="20" height="14" x="2" y="7" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium">No items yet</h3>
            <p className="text-sm text-neutral-500 max-w-sm mt-2">
              You haven't submitted any items for consignment yet. Use the Submit New Item page to get started.
            </p>
            <Button className="mt-4">Submit an Item</Button>
          </div>
        ) : (
          // Items list
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="py-2 px-4 text-left font-medium">Item</th>
                  <th className="py-2 px-4 text-center font-medium">Status</th>
                  <th className="py-2 px-4 text-right font-medium hidden sm:table-cell">Est. Price</th>
                  <th className="py-2 px-4 text-right font-medium hidden md:table-cell">Commission</th>
                  <th className="py-2 px-4 text-right font-medium">Payout</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item) => (
                  <tr
                    key={item.referenceId}
                    className="border-t cursor-pointer hover:bg-neutral-50"
                    onClick={() => onItemClick(item.referenceId)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-10 w-10 rounded-md object-cover border"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-neutral-100 flex items-center justify-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-neutral-400"
                            >
                              <path d="M21 9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path>
                              <line x1="16" x2="22" y1="4" y2="10"></line>
                              <line x1="16" x2="22" y1="10" y2="4"></line>
                              <path d="M12 12h4"></path>
                              <path d="M12 16h4"></path>
                              <path d="M8 12h.01"></path>
                              <path d="M8 16h.01"></path>
                            </svg>
                          </div>
                        )}
                        <div>
                          <p className="font-medium truncate max-w-[200px]">{item.title}</p>
                          <p className="text-xs text-neutral-500">
                            {item.referenceId} · {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge 
                        variant="outline"
                        className={getStatusColor(item.status)}
                      >
                        {formatStatus(item.status)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right hidden sm:table-cell">
                      {item.status === "pending" || item.status === "received" ? (
                        <span className="text-neutral-500">Pending</span>
                      ) : item.estimatedPrice ? (
                        <span className="font-medium">€{item.estimatedPrice.toFixed(2)}</span>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right hidden md:table-cell">
                      {item.commissionRate ? (
                        <span>{item.commissionRate}%</span>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.status === "sold" || item.status === "paid" ? (
                        <div>
                          <p className="font-medium">
                            €{item.payoutAmount?.toFixed(2) || "—"}
                          </p>
                          {item.payoutType && (
                            <p className="text-xs text-neutral-500">
                              {item.payoutType === "storeCredit" ? "Store Credit" : "Cash"}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      {/* Only show pagination if there's more than one page */}
      {totalPages > 1 && (
        <CardFooter className="flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            Showing {(page - 1) * itemsPerPage + 1}-
            {Math.min(page * itemsPerPage, items.length)} of {items.length} items
          </p>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}