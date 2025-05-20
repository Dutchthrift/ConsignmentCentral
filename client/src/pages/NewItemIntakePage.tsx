import React, { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, Check } from 'lucide-react';

/**
 * New simplified consignment item intake process
 * Uses the "/api/new-intake" endpoint for better reliability
 */
const NewItemIntakePage: React.FC = () => {
  const [, navigate] = useLocation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive"
      });
      return;
    }

    // Create preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setImage(file);
  };

  // Trigger file input click
  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your item",
        variant: "destructive"
      });
      return;
    }

    if (!image) {
      toast({
        title: "Image required",
        description: "Please upload an image of your item",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(image);
      
      reader.onload = async () => {
        const base64Image = reader.result as string;
        const imageBase64 = base64Image.split(',')[1]; // Remove data:image/jpeg;base64, prefix
        
        // Get the authentication token
        const token = localStorage.getItem('authToken');
        if (!token) {
          toast({
            title: "Authentication error",
            description: "You need to be logged in to submit items",
            variant: "destructive"
          });
          navigate('/auth');
          return;
        }

        // Send data to the new intake endpoint
        const response = await fetch('/api/new-intake', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title,
            description,
            imageBase64
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to submit item');
        }

        const data = await response.json();
        
        // Show success message
        setSuccess(true);
        setResultData(data.data);
        
        toast({
          title: "Item submitted successfully!",
          description: "Your item has been received and will be processed shortly.",
          variant: "default"
        });
      };
      
      reader.onerror = (error) => {
        toast({
          title: "Image processing error",
          description: "Failed to process image. Please try again.",
          variant: "destructive"
        });
        setIsSubmitting(false);
      };
      
    } catch (error) {
      console.error('Error submitting item:', error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };

  if (success && resultData) {
    return (
      <div className="container mx-auto max-w-3xl py-10">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Check className="h-6 w-6 text-green-600" />
              <CardTitle className="text-green-800">Item Successfully Submitted!</CardTitle>
            </div>
            <CardDescription>Your item has been received and will be processed shortly.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700">Item Details</h3>
                <div className="mt-2 rounded-md bg-white p-3 shadow-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Title:</span>
                    <span className="font-medium">{title}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Reference ID:</span>
                    <span className="font-medium">{resultData.item.referenceId}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Status:</span>
                    <span className="font-medium capitalize">{resultData.item.status}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-700">Order Information</h3>
                <div className="mt-2 rounded-md bg-white p-3 shadow-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Order Number:</span>
                    <span className="font-medium">{resultData.order.orderNumber}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Status:</span>
                    <span className="font-medium capitalize">{resultData.order.status}</span>
                  </div>
                </div>
              </div>
              
              {imagePreview && (
                <div>
                  <h3 className="font-medium text-gray-700">Item Image</h3>
                  <div className="mt-2">
                    <img 
                      src={imagePreview} 
                      alt={title}
                      className="h-48 rounded-md object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button 
              onClick={() => navigate('/consignor/dashboard')}
              variant="outline"
            >
              Go to Dashboard
            </Button>
            <Button onClick={() => {
              setTitle('');
              setDescription('');
              setImage(null);
              setImagePreview(null);
              setSuccess(false);
              setResultData(null);
            }}>
              Submit Another Item
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-10">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Submit a New Item</CardTitle>
            <CardDescription>
              Please provide details about the item you'd like to consign.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title (Required)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide any additional details about your item"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Item Image (Required)</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              
              {imagePreview ? (
                <div className="mt-2">
                  <div className="relative mb-2 h-48 w-full overflow-hidden rounded-md border border-input">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="absolute bottom-2 right-2 opacity-90"
                      onClick={handleSelectFileClick}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={handleSelectFileClick}
                  className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-input bg-muted/20 p-4 transition-colors hover:bg-muted/30"
                >
                  <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload an image of your item
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG, PNG or GIF up to 5MB
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              disabled={isSubmitting || !title || !image}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Item'
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default NewItemIntakePage;