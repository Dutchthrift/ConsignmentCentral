import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { Redirect } from 'wouter';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Upload, Check } from "lucide-react";

export default function SupabaseIntakePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // If not logged in, redirect to auth page
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
      // Store base64 for submission
      const base64String = (event.target?.result as string).split(',')[1];
      setImageBase64(base64String);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !imageBase64) {
      toast({
        title: "Missing information",
        description: "Please provide a title and upload an image of your item.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Submit to the new Supabase endpoint
      const response = await apiRequest('POST', '/api/supabase-new-intake', {
        title,
        description,
        imageBase64
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccess(true);
        
        toast({
          title: "Success!",
          description: "Your item has been submitted successfully.",
          variant: "default"
        });
        
        // Wait a moment and redirect to the dashboard
        setTimeout(() => {
          navigate('/consignor/dashboard');
        }, 2000);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit item');
      }
    } catch (error) {
      toast({
        title: "Submission failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto max-w-4xl py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Submit Item to Supabase</h1>
      <p className="text-center mb-8 text-muted-foreground">
        This page submits your consignment item directly to Supabase.
      </p>
      
      <Card>
        <CardHeader>
          <CardTitle>Item Details</CardTitle>
          <CardDescription>
            Tell us about the item you'd like to consign
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Item Name</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Vintage Camera, Designer Handbag"
                disabled={isSubmitting || success}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us more about your item"
                disabled={isSubmitting || success}
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="image">Item Image</Label>
              <div 
                className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  id="image"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isSubmitting || success}
                />
                
                {imagePreview ? (
                  <div className="space-y-2 w-full">
                    <img 
                      src={imagePreview} 
                      alt="Item preview" 
                      className="max-h-64 mx-auto object-contain rounded-md"
                    />
                    <p className="text-sm text-center text-muted-foreground">
                      Click to change image
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload an image
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || success || !title || !imageBase64}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : success ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Submitted!
                </>
              ) : (
                'Submit Item'
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => navigate('/consignor/dashboard')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}