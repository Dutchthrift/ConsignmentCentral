import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Search, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import ItemDetailModal from "@/components/ItemDetailModal";
import { apiRequest } from "@/lib/queryClient";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

// Helper to format date
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Helper to get status badge color
function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-neutral-100">Pending</Badge>;
    case "analyzed":
      return <Badge variant="outline" className="bg-purple-100 text-purple-800">Analyzed</Badge>;
    case "shipped":
      return <Badge variant="outline" className="bg-blue-100 text-blue-800">Shipped</Badge>;
    case "received":
      return <Badge variant="outline" className="bg-indigo-100 text-indigo-800">Received</Badge>;
    case "tested":
      return <Badge variant="outline" className="bg-cyan-100 text-cyan-800">Tested</Badge>;
    case "listed":
      return <Badge variant="outline" className="bg-green-100 text-green-800">Listed</Badge>;
    case "sold":
      return <Badge variant="outline" className="bg-amber-100 text-amber-800">Sold</Badge>;
    case "paid":
      return <Badge variant="outline" className="bg-green-100 text-green-800">Paid</Badge>;
    case "rejected":
      return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function ConsignorItems() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{id: number, referenceId: string} | null>(null);

  // Fetch consignor's data
  const { data: consignorData, isLoading } = useQuery<any>({
    queryKey: ["/api/consignor/dashboard"],
    enabled: !!user?.id,
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest("DELETE", `/api/consignor/items/${itemId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Item deleted",
        description: "The rejected item has been removed from your account.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/consignor/dashboard"] });
      setItemToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete item. Please try again.",
        variant: "destructive",
      });
      console.error("Delete error:", error);
    }
  });

  const items = consignorData?.data?.items || [];
  
  // Filter items based on search term
  const filteredItems = items.filter((item: any) => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.referenceId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleItemClick = (referenceId: string) => {
    setSelectedItemId(referenceId);
  };

  const handleCloseModal = () => {
    setSelectedItemId(null);
  };
  
  const handleDeleteClick = (item: {id: number, referenceId: string}) => {
    setItemToDelete(item);
  };
  
  const confirmDelete = () => {
    if (itemToDelete) {
      deleteItemMutation.mutate(itemToDelete.id);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Items</h1>
          <p className="text-neutral-600">
            View and manage all your consigned items
          </p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-500" />
          <Input
            placeholder="Search items..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>All Items</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Reference ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead>Est. Price</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Payout</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item: any) => {
                    const isRejected = item.status === "rejected";
                    
                    return (
                      <TableRow 
                        key={item.id}
                        className={isRejected ? "bg-red-50" : undefined}
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
                            <div>
                              <span className="font-medium">{item.title}</span>
                              {isRejected && (
                                <div className="text-xs text-red-600 mt-1 flex items-center">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Item not eligible for consignment
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{item.referenceId}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell>
                          {item.estimatedPrice ? `€${item.estimatedPrice.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          {item.commissionRate ? `${item.commissionRate}%` : '-'}
                        </TableCell>
                        <TableCell>
                          {item.payoutAmount ? `€${item.payoutAmount.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleItemClick(item.referenceId)}
                            >
                              Details
                            </Button>
                            
                            {isRejected && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteClick({ id: item.id, referenceId: item.referenceId })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-neutral-500">No items found</p>
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rejected Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this item from your account?
              {itemToDelete && (
                <div className="mt-2 p-3 bg-neutral-50 rounded-md border">
                  <p className="font-medium">{itemToDelete.referenceId}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteItemMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Item"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}