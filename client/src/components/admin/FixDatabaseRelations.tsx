import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Admin component to fix database relationships between items and orders
 * This is used to maintain data integrity when inconsistencies are detected
 */
const FixDatabaseRelations: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    updated?: number;
    inconsistencies?: number;
    counts?: {
      items_with_order: number;
      items_without_order: number;
    };
  } | null>(null);

  const runDatabaseFix = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setResult(null);
    
    try {
      // Direct fetch with specific headers to ensure proper JSON response handling
      const response = await fetch('/api/admin/fix-relations', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      // Check for non-JSON response (like HTML error pages)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Expected JSON response but received non-JSON content');
      }
      
      const data = await response.json();
      setResult(data);
      
      // Provide feedback via toast
      if (data.success) {
        toast({
          title: "Database fix completed",
          description: `Fixed ${data.updated || 0} item relationships`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error fixing database relations:', error);
      
      // Show error in toast
      toast({
        title: "Database fix failed",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive"
      });
      
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Fix Item-Order Relationships</CardTitle>
        <CardDescription>
          Repair inconsistencies between items and orders in the database.
          This tool ensures items are properly linked to their orders.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              <div className="flex items-start">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                )}
                <div>
                  <AlertTitle>{result.success ? 'Success!' : 'Error'}</AlertTitle>
                  <AlertDescription>
                    {result.message}
                    
                    {result.success && result.counts && (
                      <div className="mt-2 text-sm">
                        <p><strong>Updated:</strong> {result.updated} items</p>
                        <p><strong>Remaining inconsistencies:</strong> {result.inconsistencies}</p>
                        <p><strong>Items with orders:</strong> {result.counts.items_with_order}</p>
                        <p><strong>Items without orders:</strong> {result.counts.items_without_order}</p>
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Use this tool when item submission issues occur or to verify database integrity.
            </p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={runDatabaseFix} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fixing Relationships...
            </>
          ) : (
            'Fix Database Relationships'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FixDatabaseRelations;