import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ItemProps {
  referenceId: string;
  title: string;
  imageUrl?: string;
  status: string;
  createdAt: string;
  pricing?: {
    estimatedPrice?: number;
    payout?: number;
  };
  estimatedPrice?: number;
  commissionRate?: number;
  payoutAmount?: number;
  payoutType?: string;
  finalSalePrice?: number;
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

interface RecentIntakesProps {
  items?: ItemProps[];
  isLoading: boolean;
  onItemClick: (referenceId: string) => void;
  customerId?: string;
}

export default function RecentIntakes({ 
  items = [], 
  isLoading, 
  onItemClick,
  customerId
}: RecentIntakesProps) {
  // Format status for display
  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">
          {customerId ? "Customer Items" : "Recent Intakes"}
        </CardTitle>
        <Button
          variant="link"
          className="text-primary hover:text-primary-dark text-sm font-medium p-0"
        >
          View All
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                  Item
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                  Est. Price
                </th>
                {customerId && (
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                    Commission %
                  </th>
                )}
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                  Payout
                </th>
                {customerId && (
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                    Payout Method
                  </th>
                )}
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                // Loading state
                Array(5)
                  .fill(0)
                  .map((_, index) => (
                    <tr key={index} className="border-b border-neutral-200">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <Skeleton className="h-10 w-10 rounded mr-3" />
                          <div>
                            <Skeleton className="h-4 w-24 mb-1" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="py-3 px-4">
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </td>
                      <td className="py-3 px-4">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="py-3 px-4">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="py-3 px-4">
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </td>
                    </tr>
                  ))
              ) : items && items.length > 0 ? (
                // Actual data
                items.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-neutral-200 hover:bg-neutral-50 cursor-pointer"
                    onClick={() => onItemClick(item.referenceId)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-10 h-10 rounded object-cover mr-3"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-neutral-200 rounded mr-3 flex items-center justify-center text-neutral-500">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-neutral-500">
                            ID: {item.referenceId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-neutral-600">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={`${
                          statusColors[item.status] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {formatStatus(item.status)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium">
                      {(item.estimatedPrice || item.pricing?.estimatedPrice)
                        ? `€${(item.estimatedPrice || item.pricing?.estimatedPrice).toFixed(2)}`
                        : "-"}
                    </td>
                    {customerId && (
                      <td className="py-3 px-4 text-sm text-neutral-600">
                        {item.commissionRate 
                          ? `${(item.commissionRate * 100).toFixed(0)}%` 
                          : "-"}
                      </td>
                    )}
                    <td className="py-3 px-4 text-sm text-neutral-600">
                      {item.payoutAmount || item.pricing?.payout
                        ? `€${(item.payoutAmount || item.pricing?.payout).toFixed(2)}`
                        : "-"}
                    </td>
                    {customerId && (
                      <td className="py-3 px-4 text-sm text-neutral-600">
                        {item.status === "sold" || item.status === "paid" ? (
                          <select 
                            className="block w-full p-1 text-sm border border-gray-300 rounded"
                            defaultValue={item.payoutType || "cash"}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              // Call API to update payout method
                              fetch(`/api/dashboard/${customerId}/items/${item.id}/payout`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ payoutType: e.target.value }),
                              });
                            }}
                          >
                            <option value="cash">Cash</option>
                            <option value="store_credit">Store Credit (+10%)</option>
                          </select>
                        ) : (
                          "-"
                        )}
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-neutral-500 hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Add more actions if needed
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                // No data state
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500">
                    No intake items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
