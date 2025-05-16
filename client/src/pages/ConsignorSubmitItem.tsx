import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Camera, ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Form schema for item submission
const itemSubmissionSchema = z.object({
  item: z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    brand: z.string().optional(),
    category: z.string().optional(),
    condition: z.string().optional(),
  }),
});

type ItemSubmissionValues = z.infer<typeof itemSubmissionSchema>;

// Analysis result type
type AnalysisResult = {
  referenceId: string;
  title: string;
  description?: string;
  brand?: string;
  category?: string;
  condition?: string;
  analysis?: {
    productType?: string;
    brand?: string;
    model?: string;
    condition?: string;
    accessories?: string[];
    additionalNotes?: string;
  };
  pricing?: {
    estimatedMarketValue?: number;
    recommendedPrice?: number;
    estimatedPayout?: number;
    payoutMethod?: string;
  };
};

export default function ConsignorSubmitItem() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [step, setStep] = useState<'form' | 'analysis' | 'confirmation'>('form');
  
  // Define form
  const form = useForm<ItemSubmissionValues>({
    resolver: zodResolver(itemSubmissionSchema),
    defaultValues: {
      item: {
        title: "",
        description: "",
        brand: "",
        category: "",
        condition: "",
      },
    },
  });
  
  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    
    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data URL prefix
      const base64 = base64String.split(",")[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle form submission
  const onSubmit = async (values: ItemSubmissionValues) => {
    setIsSubmitting(true);
    
    try {
      // Prepare the intake payload
      const payload = {
        // Use customer information from the logged-in user
        customer: {
          name: user?.name || "",
          email: user?.email || "",
        },
        // Format as array with single item
        items: [{
          ...values.item,
          imageBase64: imageBase64,
        }],
      };
      
      // Submit to the intake endpoint
      const response = await apiRequest("POST", "/api/intake", payload);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || "Error processing item");
      }
      
      // Set analysis result and move to analysis step
      setAnalysisResult(data.data?.items?.[0] || data.data);
      setStep('analysis');
      
      toast({
        title: "Analysis complete!",
        description: `We've analyzed your item and prepared a quote`,
      });
    } catch (error) {
      console.error("Error submitting item:", error);
      toast({
        title: "Error submitting item",
        description: (error as Error).message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle confirmation
  const handleConfirm = async () => {
    setIsSubmitting(true);
    
    try {
      // For now, just consider it confirmed since the item was already created in the database
      setStep('confirmation');
      
      toast({
        title: "Item submitted successfully",
        description: `Reference ID: ${analysisResult?.referenceId || "Generated"}`,
      });
      
      // Wait a moment before redirecting
      setTimeout(() => {
        navigate("/consignor/dashboard");
      }, 3000);
    } catch (error) {
      console.error("Error confirming item:", error);
      toast({
        title: "Error confirming item",
        description: (error as Error).message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderFormStep = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Item Information</h3>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="item.title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Brand and model (e.g., Apple iPhone 14 Pro)" {...field} />
                  </FormControl>
                  <FormDescription>
                    Be as specific as possible for better AI analysis
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="item.description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the item, including condition, accessories, etc."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="item.brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                  <FormControl>
                    <Input placeholder="Brand name (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="item.category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="Category (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="item.condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition</FormLabel>
                  <FormControl>
                    <Input placeholder="Condition (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Item Image</p>
              <div className="mt-1 flex items-center">
                <div className="border-2 border-dashed rounded-md px-6 py-8 w-full">
                  <div className="text-center">
                    <Camera className="h-12 w-12 mx-auto text-gray-400" />
                    <div className="mt-2">
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer bg-white rounded-md px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-500"
                      >
                        Upload a photo
                      </label>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                      <p className="text-xs text-gray-500">
                        Upload a clear image of the item for AI analysis
                      </p>
                    </div>
                    
                    {imagePreview && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Image Preview</p>
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-48 object-contain border rounded-md mx-auto"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <CardFooter className="flex justify-end p-0">
          <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit for Analysis
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
  
  const renderAnalysisStep = () => {
    if (!analysisResult) return null;
    
    // Calculate values in euros
    const marketValue = analysisResult.pricing?.estimatedMarketValue 
      ? (analysisResult.pricing.estimatedMarketValue / 100).toFixed(2)
      : "N/A";
    
    const recommendedPrice = analysisResult.pricing?.recommendedPrice
      ? (analysisResult.pricing.recommendedPrice / 100).toFixed(2)
      : "N/A";
    
    const estimatedPayout = analysisResult.pricing?.estimatedPayout
      ? (analysisResult.pricing.estimatedPayout / 100).toFixed(2)
      : "N/A";
    
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium">AI Analysis Results</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Reference ID:</span>
                <span>{analysisResult.referenceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Product Type:</span>
                <span>{analysisResult.analysis?.productType || "Not detected"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Brand:</span>
                <span>{analysisResult.analysis?.brand || analysisResult.brand || "Not detected"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Model:</span>
                <span>{analysisResult.analysis?.model || "Not detected"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Condition:</span>
                <span>{analysisResult.analysis?.condition || analysisResult.condition || "Not detected"}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Market Value & Payout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Market Value:</span>
                <span>€{marketValue}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Recommended Price:</span>
                <span>€{recommendedPrice}</span>
              </div>
              <div className="flex justify-between font-semibold text-green-600">
                <span>Estimated Payout:</span>
                <span>€{estimatedPayout}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Payout Method:</span>
                <span>{analysisResult.pricing?.payoutMethod || "Standard"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {imagePreview && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Item Image</p>
            <img
              src={imagePreview}
              alt="Item"
              className="h-48 object-contain border rounded-md"
            />
          </div>
        )}
        
        {analysisResult.analysis?.accessories && analysisResult.analysis.accessories.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Included Accessories</h4>
            <ul className="list-disc pl-4 text-sm">
              {analysisResult.analysis.accessories.map((accessory, index) => (
                <li key={index}>{accessory}</li>
              ))}
            </ul>
          </div>
        )}
        
        {analysisResult.analysis?.additionalNotes && (
          <div>
            <h4 className="text-sm font-medium mb-2">Additional Notes</h4>
            <p className="text-sm">{analysisResult.analysis.additionalNotes}</p>
          </div>
        )}
        
        <Separator />
        
        <div className="flex flex-col md:flex-row gap-2 justify-end">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => setStep('form')}
            disabled={isSubmitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Edit
          </Button>
          <Button 
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Add to Inventory
          </Button>
        </div>
      </div>
    );
  };
  
  const renderConfirmationStep = () => (
    <div className="space-y-6">
      <Alert className="bg-green-50 border-green-200">
        <AlertTitle className="text-green-800">Item Successfully Submitted!</AlertTitle>
        <AlertDescription className="text-green-700">
          Your item has been added to your inventory. You'll be notified when it's been reviewed by our team.
        </AlertDescription>
      </Alert>
      
      <div className="border rounded-md p-4">
        <p className="text-sm font-medium">Item Reference:</p>
        <p className="text-2xl font-bold">{analysisResult?.referenceId || "Generated"}</p>
        <p className="text-xs text-gray-500 mt-1">Use this reference number if you need to contact support about this item.</p>
      </div>
      
      <div className="flex justify-center">
        <Button onClick={() => navigate("/consignor/dashboard")}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
  
  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Submit New Item</CardTitle>
          <CardDescription>
            Submit your item for analysis, pricing, and consignment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'form' && renderFormStep()}
          {step === 'analysis' && renderAnalysisStep()}
          {step === 'confirmation' && renderConfirmationStep()}
        </CardContent>
      </Card>
    </div>
  );
}