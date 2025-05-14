import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import RecentIntakes from "@/components/RecentIntakes";
import ConsignorStats from "@/components/ConsignorStats";
import ItemDetailModal from "@/components/ItemDetailModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function ConsignorDashboard() {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Get user from auth context
  const { user, isLoading: userLoading } = useAuth();
  
  // Fetch consignor's data
  const { data: consignorData, isLoading: consignorLoading } = useQuery<any>({
    queryKey: ["/api/consignor/dashboard"],
    enabled: !!user?.id,
  });
  
  const handleItemClick = (referenceId: string) => {
    setSelectedItemId(referenceId);
  };
  
  const handleCloseModal = () => {
    setSelectedItemId(null);
  };
  
  const isLoading = userLoading || consignorLoading;
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Welcome, {user?.name || "Consignor"}</h1>
        <p className="text-neutral-600">
          Here's an overview of your consigned items and their current status.
        </p>
      </div>
      
      {/* Stats overview */}
      <ConsignorStats 
        stats={consignorData?.data?.stats}
        consignor={consignorData?.data?.consignor}
        isLoading={isLoading}
      />
      
      {/* Items overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Active Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 p-3 mr-4">
                <Package className="h-6 w-6 text-blue-700" />
              </div>
              {isLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div>
                  <p className="text-3xl font-bold">
                    {consignorData?.data?.stats?.itemsPerStatus?.listed || 0}
                  </p>
                  <p className="text-sm text-neutral-500">Items for sale</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Recently Sold</CardTitle>
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
                  <path d="M3 3v18h18"></path>
                  <path d="m19 9-5 5-4-4-3 3"></path>
                </svg>
              </div>
              {isLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div>
                  <p className="text-3xl font-bold">
                    {(consignorData?.data?.stats?.itemsPerStatus?.sold || 0) + 
                     (consignorData?.data?.stats?.itemsPerStatus?.paid || 0)}
                  </p>
                  <p className="text-sm text-neutral-500">Items sold</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Pending Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="rounded-full bg-amber-100 p-3 mr-4">
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
                  className="h-6 w-6 text-amber-700"
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
                    €{consignorData?.data?.pendingPayout?.toFixed(2) || "0.00"}
                  </p>
                  <p className="text-sm text-neutral-500">Available to withdraw</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* My Items */}
      <RecentIntakes 
        items={consignorData?.data?.items}
        isLoading={isLoading}
        onItemClick={handleItemClick}
        customerId={user?.id?.toString()}
      />
      
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