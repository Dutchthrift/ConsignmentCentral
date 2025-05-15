import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Eye, Search, User, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddConsignorModal } from "@/components/AddConsignorModal";

interface ConsignorProps {
  id: number;
  name: string;
  email: string;
  totalItems: number;
  totalSales: number;
}

export default function Consignors() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  // Fetch all consignors from admin API
  const { data, isLoading, error } = useQuery<{ success: boolean; data: ConsignorProps[] }>({
    queryKey: ["/api/admin/consignors"]
  });

  // Handle authorization errors
  if (error) {
    const err = error as any;
    if (err.response?.status === 403) {
      toast({
        title: "Access denied",
        description: "You don't have permission to view this page",
        variant: "destructive"
      });
      navigate("/");
    }
  }
  
  // Filter consignors based on search query
  const filteredConsignors = data?.data?.filter((consignor: ConsignorProps) => 
    consignor.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    consignor.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
  // Handler for useEffect to check for errors
  useEffect(() => {
    if (error) {
      const err = error as any;
      if (err.response?.status === 403) {
        toast({
          title: "Access denied",
          description: "You don't have permission to view this page. Admin access required.",
          variant: "destructive"
        });
        navigate("/");
      }
    }
  }, [error, navigate, toast]);
  
  // Handler for opening the add consignor modal
  const handleOpenAddModal = () => {
    setShowAddModal(true);
  };
  
  // Handler for closing the add consignor modal
  const handleCloseAddModal = () => {
    setShowAddModal(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Consignors Management</h1>
          <p className="text-muted-foreground">View and manage all consignors in the system</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-500" />
            <Input
              placeholder="Search consignors..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            className="flex items-center gap-1" 
            onClick={handleOpenAddModal}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Consignor
          </Button>
        </div>
      </div>
      
      {/* Add Consignor Modal */}
      <AddConsignorModal 
        isOpen={showAddModal} 
        onClose={handleCloseAddModal} 
      />
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">All Consignors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Items</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Total Sales</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">Actions</th>
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
                            <Skeleton className="h-8 w-8 rounded-full mr-3" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-40" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-8" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-8 w-28" /></td>
                      </tr>
                    ))
                ) : filteredConsignors.length > 0 ? (
                  // Actual data
                  filteredConsignors.map((consignor) => (
                    <tr key={consignor.id} className="border-b border-neutral-200 hover:bg-neutral-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center mr-3">
                            <User className="h-4 w-4" />
                          </div>
                          <span className="font-medium">{consignor.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-neutral-600">{consignor.email}</td>
                      <td className="py-3 px-4 text-sm">{consignor.totalItems}</td>
                      <td className="py-3 px-4 text-sm font-medium">€{consignor.totalSales.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => navigate(`/dashboard/${consignor.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Dashboard
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  // No results state
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-500">
                      No consignors found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}