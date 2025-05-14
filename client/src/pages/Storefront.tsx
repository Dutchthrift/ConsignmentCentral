import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

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
import { Separator } from "@/components/ui/separator";
import { 
  Camera, 
  Check, 
  Loader2, 
  Sparkles,
  Brain,
  DollarSign,
  PackageCheck
} from "lucide-react";

// Form schema 
const storeFrontSchema = z.object({
  customer: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().default("US"),
  }),
  item: z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
  }),
});

export default function Storefront() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [activeStep, setActiveStep] = useState(1);

  // Define form
  const form = useForm({
    resolver: zodResolver(storeFrontSchema),
    defaultValues: {
      customer: {
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        country: "US",
      },
      item: {
        title: "",
        description: "",
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
  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    
    try {
      // Add image base64 to the payload
      const payload = {
        ...data,
        item: {
          ...data.item,
          imageBase64: imageBase64,
        },
      };
      
      const response = await apiRequest("POST", "/api/intake", payload);
      const result = await response.json();
      
      if (result.success) {
        setQuoteResult(result.data);
        setActiveStep(2); // Move to the next step
        
        toast({
          title: "Analysis complete!",
          description: "We've analyzed your item and prepared a quote",
        });
      }
    } catch (error) {
      console.error("Error submitting intake:", error);
      toast({
        title: "Error submitting item",
        description: (error as Error).message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Accept the quote
  const handleAcceptQuote = () => {
    toast({
      title: "Quote accepted!",
      description: "We'll send you a shipping label by email soon",
    });
    setActiveStep(3);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/10 to-white">
      {/* Hero Section */}

      <main className="container mx-auto px-4 md:px-6 py-8">
        {/* Steps */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex justify-between">
            <div className={`flex flex-col items-center ${activeStep >= 1 ? 'text-primary' : 'text-neutral-400'}`}>
              <div className={`w-10 h-10 rounded-full ${activeStep >= 1 ? 'dutch-thrift-gradient' : 'bg-neutral-200'} flex items-center justify-center text-white mb-2 shadow-md`}>
                <Camera className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">Submit Item</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className={`h-1 w-full ${activeStep >= 2 ? 'dutch-thrift-gradient' : 'bg-neutral-200'}`}></div>
            </div>
            <div className={`flex flex-col items-center ${activeStep >= 2 ? 'text-primary' : 'text-neutral-400'}`}>
              <div className={`w-10 h-10 rounded-full ${activeStep >= 2 ? 'dutch-thrift-gradient' : 'bg-neutral-200'} flex items-center justify-center text-white mb-2 shadow-md`}>
                <DollarSign className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">View Quote</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className={`h-1 w-full ${activeStep >= 3 ? 'dutch-thrift-gradient' : 'bg-neutral-200'}`}></div>
            </div>
            <div className={`flex flex-col items-center ${activeStep >= 3 ? 'text-primary' : 'text-neutral-400'}`}>
              <div className={`w-10 h-10 rounded-full ${activeStep >= 3 ? 'dutch-thrift-gradient' : 'bg-neutral-200'} flex items-center justify-center text-white mb-2 shadow-md`}>
                <PackageCheck className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">Ship Item</span>
            </div>
          </div>
        </div>

        {activeStep === 1 && (
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/2 dutch-thrift-gradient text-white p-8">
                <h2 className="text-2xl font-bold mb-4">Start Your Consignment Journey</h2>
                <p className="mb-6">Turn your unused items into cash with our hassle-free consignment service.</p>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <Check className="h-5 w-5 text-green-300" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium">AI-Powered Analysis</h3>
                      <p className="text-white/80">Our advanced AI identifies the optimal value for your items</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <Check className="h-5 w-5 text-green-300" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium">Market-Based Pricing</h3>
                      <p className="text-white/80">Get fair value based on actual recent sales data</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <Check className="h-5 w-5 text-green-300" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium">Easy Shipping</h3>
                      <p className="text-white/80">We provide a free shipping label - just drop it off</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="md:w-1/2 p-8">
                <h2 className="text-2xl font-bold mb-6">Tell Us About Your Item</h2>
                
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
                              <FormLabel>Item Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Fuji Camera DL-1000" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="item.description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Item Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe the item, including condition and accessories" 
                                  rows={3}
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div>
                          <FormLabel>Item Image</FormLabel>
                          <div className="mt-1">
                            <label
                              htmlFor="file-upload"
                              className="cursor-pointer bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none flex items-center justify-center w-full"
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              Upload Image
                            </label>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={handleFileChange}
                            />
                            <p className="text-xs text-gray-500 mt-1 text-center">
                              Clear image helps our AI analyze better
                            </p>
                          </div>
                          
                          {imagePreview && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-gray-700 mb-2">Image Preview</p>
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="h-32 object-contain border rounded-md mx-auto"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">Your Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="customer.name"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="customer.email"
                          render={({ field }) => (
                            <FormItem className="col-span-2 md:col-span-1">
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="you@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="customer.phone"
                          render={({ field }) => (
                            <FormItem className="col-span-2 md:col-span-1">
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="(123) 456-7890" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        disabled={isSubmitting || !imageBase64} 
                        className="w-full btn-gradient"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing your item...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Get Free Quote
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          </div>
        )}

        {activeStep === 2 && quoteResult && (
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-8">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-center mb-2">Your Item Quote is Ready!</h2>
              <p className="text-center text-neutral-600 mb-8">
                We've analyzed your {quoteResult.title} and prepared an estimate
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="border rounded-lg overflow-hidden">
                    {imagePreview ? (
                      <img 
                        src={imagePreview} 
                        alt={quoteResult.title} 
                        className="w-full h-48 object-contain bg-neutral-100"
                      />
                    ) : (
                      <div className="w-full h-48 bg-neutral-100 flex items-center justify-center">
                        <Camera className="h-12 w-12 text-neutral-400" />
                      </div>
                    )}
                    
                    <div className="p-4">
                      <h3 className="font-medium">{quoteResult.title}</h3>
                      <p className="text-sm text-neutral-500 mt-1">Reference: {quoteResult.referenceId}</p>
                      
                      {quoteResult.analysis && (
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center text-sm">
                            <Brain className="h-4 w-4 text-primary mr-2" />
                            <span className="text-neutral-600">
                              <span className="font-medium">Analysis:</span> {quoteResult.analysis.productType}
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <span className="text-neutral-600 ml-6">
                              <span className="font-medium">Brand:</span> {quoteResult.analysis.brand}
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <span className="text-neutral-600 ml-6">
                              <span className="font-medium">Condition:</span> {quoteResult.analysis.condition}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col justify-between">
                  <div>
                    <div className="bg-primary-light/10 rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-medium mb-4">Your Estimate</h3>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Estimated Sale Price:</span>
                          <span className="font-medium">
                            {quoteResult.pricing?.estimatedSalePrice 
                              ? formatCurrency(quoteResult.pricing.estimatedSalePrice)
                              : '-'}
                          </span>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Your Payout ({quoteResult.pricing?.commissionRate ? (100 - quoteResult.pricing.commissionRate) : 70}%):</span>
                          <span className="font-medium text-lg text-primary">
                            {quoteResult.pricing?.yourPayout 
                              ? formatCurrency(quoteResult.pricing.yourPayout)
                              : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-neutral-600">
                      <p>
                        <Check className="h-4 w-4 text-green-500 inline mr-2" />
                        Free shipping label provided
                      </p>
                      <p>
                        <Check className="h-4 w-4 text-green-500 inline mr-2" />
                        Professional listing creation
                      </p>
                      <p>
                        <Check className="h-4 w-4 text-green-500 inline mr-2" />
                        Payment within 7 days of sale
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-3">
                    <Button 
                      onClick={handleAcceptQuote} 
                      className="w-full btn-gradient"
                      size="lg"
                    >
                      Accept & Continue
                    </Button>
                    <Button variant="outline" className="w-full">
                      Decline Quote
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold mb-2">You're all set!</h2>
              <p className="text-neutral-600 max-w-md mx-auto mb-8">
                We'll send you an email with your shipping label and instructions within the next 24 hours.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto text-center">
                <div className="p-4 border rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <h3 className="font-medium mb-1">Pack</h3>
                  <p className="text-sm text-neutral-500">Securely pack your item in a box</p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <PackageCheck className="h-6 w-6" />
                  </div>
                  <h3 className="font-medium mb-1">Ship</h3>
                  <p className="text-sm text-neutral-500">Attach label and drop off at carrier</p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <h3 className="font-medium mb-1">Get Paid</h3>
                  <p className="text-sm text-neutral-500">Receive payment when your item sells</p>
                </div>
              </div>
              
              <div className="mt-8">
                <p className="text-sm text-neutral-600 mb-4">
                  Reference: {quoteResult?.referenceId}
                </p>
                <Button onClick={() => navigate("/")}>Return to Dashboard</Button>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-neutral-800 text-white py-8 mt-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-medium mb-4">About ConsignPro</h3>
              <p className="text-neutral-400 text-sm">
                We make selling your unused items simple, fast, and profitable. 
                Our AI-powered platform helps you get the best value for your items.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-neutral-400 hover:text-white text-sm">How It Works</a></li>
                <li><a href="#" className="text-neutral-400 hover:text-white text-sm">Pricing</a></li>
                <li><a href="#" className="text-neutral-400 hover:text-white text-sm">FAQ</a></li>
                <li><a href="#" className="text-neutral-400 hover:text-white text-sm">Contact Us</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">Contact</h3>
              <p className="text-neutral-400 text-sm">123 Main Street<br />Anytown, CA 12345</p>
              <p className="text-neutral-400 text-sm mt-2">support@consignpro.com<br />(555) 123-4567</p>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-neutral-700 text-center text-neutral-400 text-sm">
            © {new Date().getFullYear()} ConsignPro. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}