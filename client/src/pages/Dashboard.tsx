import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "wouter";
import StatsOverview from "@/components/StatsOverview";
import RecentIntakes from "@/components/RecentIntakes";
import ProcessSteps from "@/components/ProcessSteps";
import ApiStatus from "@/components/ApiStatus";
import ItemDetailModal from "@/components/ItemDetailModal";
import { DashboardStats } from "@shared/schema";

export default function Dashboard() {
  const { customerId } = useParams<{ customerId?: string }>();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Fetch dashboard statistics
  const { data: statsData, isLoading: statsLoading } = useQuery<{ success: boolean; data: DashboardStats }>({
    queryKey: ["/api/dashboard/stats"],
  });
  
  // Fetch recent intakes (or customer-specific intakes if customerId is provided)
  const { data: intakesData, isLoading: intakesLoading } = useQuery<any>({
    queryKey: customerId ? [`/api/dashboard/${customerId}`] : ["/api/dashboard/items/recent"],
  });
  
  const handleItemClick = (referenceId: string) => {
    setSelectedItemId(referenceId);
  };
  
  const handleCloseModal = () => {
    setSelectedItemId(null);
  };
  
  const dashboardTitle = customerId 
    ? `Customer Dashboard: ${intakesData?.data?.customer?.name || "Loading..."}`
    : "Dashboard";
  
  return (
    <div>
      {/* Stats overview */}
      <StatsOverview 
        stats={statsData?.data || { totalIntakes: 0, pendingAnalysis: 0, activeListings: 0, soldItems: 0 }}
        isLoading={statsLoading}
      />
      
      {/* Recent Intakes */}
      <RecentIntakes 
        items={customerId ? intakesData?.data?.items : intakesData?.data}
        isLoading={intakesLoading}
        onItemClick={handleItemClick}
        customerId={customerId}
      />
      
      {/* Process steps and API status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ProcessSteps />
        <ApiStatus />
      </div>
      
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
