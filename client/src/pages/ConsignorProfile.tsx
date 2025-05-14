import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Camera, UserRound } from "lucide-react";

export default function ConsignorProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
  });

  // Fetch consignor's data
  const { data: consignorData, isLoading } = useQuery<any>({
    queryKey: ["/api/consignor/dashboard"],
    enabled: !!user?.id,
  });
  
  // Initialize form data when data loads
  React.useEffect(() => {
    if (consignorData?.data?.consignor) {
      const consignor = consignorData.data.consignor;
      setFormData({
        name: consignor.name || "",
        email: consignor.email || "",
        phone: consignor.phone || "",
        address: consignor.address || "",
        city: consignor.city || "",
        postalCode: consignor.postalCode || "",
        country: consignor.country || "Netherlands",
      });
    }
  }, [consignorData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    // This would be an API call in production
    toast({
      title: "Profile updated",
      description: "Your profile information has been updated successfully.",
    });
    setIsEditing(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-neutral-600">
          View and update your account information
        </p>
      </div>

      {/* Profile overview */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle>Profile Information</CardTitle>
              {!isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-60" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {Array(6).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              </div>
            ) : isEditing ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={user?.profileImageUrl || ""} />
                      <AvatarFallback className="bg-primary text-white text-xl">
                        {user?.name?.charAt(0) || <UserRound />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1 cursor-pointer">
                      <Camera className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium">{user?.name}</h3>
                    <p className="text-sm text-neutral-500">{user?.email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={handleInputChange}
                      disabled
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input 
                      id="address" 
                      name="address" 
                      value={formData.address} 
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input 
                      id="city" 
                      name="city" 
                      value={formData.city} 
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input 
                      id="postalCode" 
                      name="postalCode" 
                      value={formData.postalCode} 
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input 
                      id="country" 
                      name="country" 
                      value={formData.country} 
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user?.profileImageUrl || ""} />
                    <AvatarFallback className="bg-primary text-white text-xl">
                      {user?.name?.charAt(0) || <UserRound />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{formData.name}</h3>
                    <p className="text-sm text-neutral-500">{formData.email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Phone Number</p>
                    <p className="font-medium">{formData.phone || "Not provided"}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Address</p>
                    <p className="font-medium">{formData.address || "Not provided"}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">City</p>
                    <p className="font-medium">{formData.city || "Not provided"}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Postal Code</p>
                    <p className="font-medium">{formData.postalCode || "Not provided"}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Country</p>
                    <p className="font-medium">{formData.country || "Not provided"}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Account Created</p>
                    <p className="font-medium">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Account Security</CardTitle>
            <CardDescription>Manage your password and account security</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <p className="font-medium">Password</p>
                  <p className="text-sm text-neutral-500">Last updated: Never</p>
                </div>
                <Button variant="outline">Change Password</Button>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-neutral-500">Add an extra layer of security</p>
                </div>
                <Button variant="outline">Enable 2FA</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}