import { useState } from "react";
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
import { AlertTriangle } from "lucide-react";

// Helper to format date
function formatDate(dateString: string) {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return dateString;
  }
}

// Helper to get status badge color
function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-neutral-100">Pending</Badge>;
    case "analyzed":
      return <Badge variant="outline" className="bg-purple-100 text-purple-800">Analyzed</Badge>;
    case "shipping":
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

interface ConsignorItemsTableProps {
  items: any[];
  onItemClick: (referenceId: string) => void;
  onDeleteClick?: (item: {id: number, referenceId: string}) => void;
}

export default function ConsignorItemsTable({ 
  items, 
  onItemClick,
  onDeleteClick 
}: ConsignorItemsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter items based on search term
  const filteredItems = items.filter((item: any) => 
    (item.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.referenceId || "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Reference ID</TableHead>
            <TableHead>Order Number</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date Added</TableHead>
            <TableHead>Actions</TableHead>
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
                      <span className="font-medium">{item.title || "Unnamed Item"}</span>
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
                <TableCell>
                  {item.orderNumber ? (
                    <span className="text-blue-600 font-medium">{item.orderNumber}</span>
                  ) : (
                    <span className="text-gray-400 italic">Not assigned</span>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell>{formatDate(item.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onItemClick(item.referenceId)}
                    >
                      Details
                    </Button>
                    
                    {isRejected && onDeleteClick && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => onDeleteClick({ id: item.id, referenceId: item.referenceId })}
                      >
                        Delete
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
  );
}