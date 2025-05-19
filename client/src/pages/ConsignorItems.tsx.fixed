import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function ConsignorItems() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{id: number, referenceId: string} | null>(null);

  // Fetch consignor's items from the dashboard endpoint since that's what works
  const { data: consignorData, isLoading } = useQuery<any>({
    queryKey: ["/api/consignor/dashboard"],
    enabled: !!user?.id,
    retry: 3,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000)
  });

  // Extract items from the dashboard response
  const items = consignorData?.data?.items || [];

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
      queryClient.invalidateQueries({ queryKey: ["/api/consignor/items"] });
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
  
  // Filter items based on search term
  const filteredItems = items.filter((item: any) => 
    (item.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.referenceId || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [, navigate] = useLocation();
  
  const handleItemClick = (referenceId: string) => {
    // Show modal instead of navigating
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
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Item</th>
                    <th className="text-left py-3 px-4 font-medium">Reference ID</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Date Added</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item: any) => (
                    <tr key={item.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4">{item.title || "Unnamed Item"}</td>
                      <td className="py-3 px-4">{item.referenceId}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.status === 'pending' ? 'bg-gray-100' :
                          item.status === 'analyzing' ? 'bg-purple-100 text-purple-800' :
                          item.status === 'approved' ? 'bg-green-100 text-green-800' :
                          item.status === 'listed' ? 'bg-blue-100 text-blue-800' :
                          item.status === 'sold' ? 'bg-amber-100 text-amber-800' :
                          item.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100'
                        }`}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleItemClick(item.referenceId)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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