import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent 
} from "@/components/ui/card";
import { 
  Table, TableHeader, TableRow, TableHead, 
  TableBody, TableCell 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AllIntakesProps {
  onItemClick: (referenceId: string) => void;
}

interface IntakeItem {
  id: number;
  referenceId: string;
  title: string;
  brand?: string;
  status: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
}

export default function AllIntakes({ onItemClick }: AllIntakesProps) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const { data: items, isLoading, error } = useQuery<IntakeItem[]>({
    queryKey: ["/api/dashboard/items/recent"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/dashboard/items/recent");
        if (!response.ok) {
          throw new Error(`Failed to fetch items: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.data || [];
      } catch (err) {
        console.error("Error fetching items:", err);
        toast({
          variant: "destructive",
          title: "Error loading items",
          description: "Could not load intake items. Please try again later."
        });
        return [];
      }
    }
  });
  
  // Calculate pagination
  const totalPages = items ? Math.ceil(items.length / itemsPerPage) : 0;
  const paginatedItems = items ? items.slice((page - 1) * itemsPerPage, page * itemsPerPage) : [];

  // Get status badge color based on the item status
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      received: { variant: "secondary", label: "Received" },
      analyzing: { variant: "outline", label: "Analyzing" },
      pricing: { variant: "outline", label: "Pricing" },
      approved: { variant: "default", label: "Approved" },
      listed: { variant: "default", label: "Listed" },
      sold: { variant: "default", label: "Sold" },
      rejected: { variant: "destructive", label: "Rejected" },
      returned: { variant: "outline", label: "Returned" }
    };
    
    const config = statusMap[status.toLowerCase()] || { variant: "outline", label: status };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex h-48 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-destructive">
        Error loading items. Please try again.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Intakes</CardTitle>
        <CardDescription>
          View and manage all consignor intake submissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {paginatedItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No intake items found.
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Consignor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.referenceId}</TableCell>
                      <TableCell>{item.title || "Unnamed Item"}</TableCell>
                      <TableCell>{item.customerName || "Unknown"}</TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onItemClick(item.referenceId)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {totalPages > 1 && (
              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}