import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Helper to format date
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ConsignorPayouts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState("bank");

  // Fetch consignor's data
  const { data: consignorData, isLoading } = useQuery<any>({
    queryKey: ["/api/consignor/dashboard"],
    enabled: !!user?.id,
  });

  const pendingPayout = consignorData?.data?.pendingPayout || 0;
  const items = consignorData?.data?.items || [];
  
  // Filter only sold but not paid items
  const pendingItems = items.filter((item: any) => 
    item.status === "sold" && !item.status.includes("paid")
  );

  // Mock payout history (to be replaced with actual data from API)
  const payoutHistory = [
    {
      id: 1,
      date: "2024-12-15",
      amount: 253.45,
      method: "bank",
      status: "completed"
    },
    {
      id: 2,
      date: "2024-10-28",
      amount: 120.00,
      method: "storecredit",
      status: "completed"
    },
  ];
  
  const handleRequestPayout = () => {
    // This would be an API call in production
    toast({
      title: "Payout requested",
      description: `Your payout of €${pendingPayout.toFixed(2)} has been requested via ${payoutMethod === "bank" ? "bank transfer" : "store credit"}.`,
    });
    setIsRequestDialogOpen(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Payouts</h1>
        <p className="text-neutral-600">
          Manage your payment preferences and request payouts
        </p>
      </div>

      {/* Available Balance Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-sm text-neutral-500 font-medium mb-1">Available Balance</p>
              {isLoading ? (
                <Skeleton className="h-10 w-28" />
              ) : (
                <p className="text-3xl font-bold">€{pendingPayout.toFixed(2)}</p>
              )}
            </div>
            
            <Button 
              disabled={pendingPayout <= 0} 
              onClick={() => setIsRequestDialogOpen(true)}
            >
              Request Payout
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Items */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle>Pending Payouts</CardTitle>
          <CardDescription>Items sold but not yet paid out</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : pendingItems.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Sale Date</TableHead>
                    <TableHead>Sale Price</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Payout Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingItems.map((item: any) => (
                    <TableRow key={item.id}>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-neutral-500">No pending payouts available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Payout History</CardTitle>
          <CardDescription>Previous payouts</CardDescription>
        </CardHeader>
        <CardContent>
          {payoutHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutHistory.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>{formatDate(payout.date)}</TableCell>
                      <TableCell>€{payout.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        {payout.method === "bank" ? "Bank Transfer" : "Store Credit"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-neutral-500">No payout history available</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Request Payout Dialog */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              Choose your preferred payout method. Store credit offers a 10% bonus on your total amount.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Available for payout</p>
              <p className="text-2xl font-bold">€{pendingPayout.toFixed(2)}</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Payout Method</p>
              <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payout method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Payout Methods</SelectLabel>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="storecredit">
                      Store Credit (+10% bonus)
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              
              {payoutMethod === "storecredit" && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    You will receive <span className="font-bold">€{(pendingPayout * 1.1).toFixed(2)}</span> in store credit.
                    That's an extra €{(pendingPayout * 0.1).toFixed(2)}!
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestPayout}>
              Confirm Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}