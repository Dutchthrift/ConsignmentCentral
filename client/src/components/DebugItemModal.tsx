import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ItemDetailsProps {
  referenceId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function DebugItemModal({ referenceId, isOpen, onClose }: ItemDetailsProps) {
  const { toast } = useToast();
  const [rawData, setRawData] = useState<string>("");
  
  const { isLoading, error } = useQuery({
    queryKey: [`/api/items/${referenceId}-debug`],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/items/${referenceId}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch item: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Debug response:", data);
        
        // Format the JSON data nicely for display
        setRawData(JSON.stringify(data, null, 2));
        return data;
      } catch (err) {
        console.error(`Error fetching item ${referenceId}:`, err);
        toast({
          variant: "destructive",
          title: "Error loading item details",
          description: "Could not load the item details. Please try again later."
        });
        throw err;
      }
    },
    enabled: isOpen && !!referenceId,
    retry: 1
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-semibold">
              Item Debug View
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 mt-1">
              <span>Reference: {referenceId}</span>
            </DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex h-48 w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center p-4 text-destructive">
            Error loading item details. Please try again.
          </div>
        ) : (
          <div className="p-4 bg-muted rounded-md">
            <h3 className="text-sm font-medium mb-2">API Response Data:</h3>
            <pre className="text-xs overflow-auto whitespace-pre-wrap bg-background p-4 rounded max-h-[400px]">
              {rawData}
            </pre>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}