import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import ItemDetailModal from "@/components/ItemDetailModal";

// Helper to format date
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ConsignorHistory() {
  const { user } = useAuth();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Fetch consignor's data
  const { data: consignorData, isLoading } = useQuery<any>({
    queryKey: ["/api/consignor/dashboard"],
    enabled: !!user?.id,
  });

  const items = consignorData?.data?.items || [];
  
  // Filter only sold or paid items
  const soldItems = items.filter((item: any) => 
    item.status === "sold" || item.status === "paid"
  );

  const handleItemClick = (referenceId: string) => {
    setSelectedItemId(referenceId);
  };

  const handleCloseModal = () => {
    setSelectedItemId(null);
  };

  // Calculate total earnings
  const totalEarnings = soldItems.reduce((total: number, item: any) => {
    return total + (item.payoutAmount || 0);
  }, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Sales History</h1>
        <p className="text-neutral-600">
          View your complete sales history and earnings
        </p>
      </div>

      {/* Sales summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="rounded-full bg-green-100 p-3 mr-4">
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
                  className="h-6 w-6 text-green-700"
                >
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" x2="22" y1="10" y2="10" />
                </svg>
              </div>
              {isLoading ? (
                <Skeleton className="h-10 w-28" />
              ) : (
                <div>
                  <p className="text-3xl font-bold">
                    {soldItems.length}
                  </p>
                  <p className="text-sm text-neutral-500">Items sold</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="rounded-full bg-green-100 p-3 mr-4">
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
                  className="h-6 w-6 text-green-700"
                >
                  <path d="M12 2v20"></path>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              {isLoading ? (
                <Skeleton className="h-10 w-28" />
              ) : (
                <div>
                  <p className="text-3xl font-bold">
                    €{totalEarnings.toFixed(2)}
                  </p>
                  <p className="text-sm text-neutral-500">Total earned</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales history table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Sales History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : soldItems.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Reference ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sale Date</TableHead>
                    <TableHead>Sale Price</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Payout</TableHead>
                    <TableHead>Payout Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {soldItems.map((item: any) => (
                    <TableRow 
                      key={item.id}
                      className="cursor-pointer hover:bg-neutral-50"
                      onClick={() => handleItemClick(item.referenceId)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="h-10 w-10 rounded-md object-cover"
                            />
                          )}
                          <span className="font-medium">{item.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.referenceId}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          item.status === "paid" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-amber-100 text-amber-800"
                        }>
                          {item.status === "paid" ? "Paid" : "Sold"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell>
                        {item.finalSalePrice ? `€${item.finalSalePrice.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        {item.commissionRate ? `${item.commissionRate}%` : '-'}
                      </TableCell>
                      <TableCell>
                        {item.payoutAmount ? `€${item.payoutAmount.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          item.payoutType === "storecredit" 
                            ? "bg-blue-100 text-blue-800" 
                            : "bg-green-100 text-green-800"
                        }>
                          {item.payoutType === "storecredit" ? "Store Credit" : "Cash"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-neutral-500">No sales history available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item detail modal */}
      {selectedItemId && (
        <ItemDetailModal
          referenceId={selectedItemId}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}