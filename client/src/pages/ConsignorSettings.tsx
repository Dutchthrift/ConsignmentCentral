import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { LogoutButton } from "@/components/LogoutButton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ConsignorSettings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    statusUpdates: true,
    payoutNotifications: true,
    marketingEmails: false,
  });
  
  // Payment preferences
  const [defaultPayoutMethod, setDefaultPayoutMethod] = useState("bank");
  const [bankDetails, setBankDetails] = useState({
    accountType: "checking",
    currency: "eur",
  });
  
  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    shareAnalytics: true,
    shareContactInfo: false,
  });

  const handleNotificationToggle = (key: string) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
    
    toast({
      title: "Notification settings updated",
      description: "Your notification preferences have been saved.",
    });
  };

  const handleSavePayoutPreferences = () => {
    toast({
      title: "Payout preferences updated",
      description: "Your default payout method has been updated.",
    });
  };

  const handleSavePrivacySettings = () => {
    toast({
      title: "Privacy settings updated",
      description: "Your privacy preferences have been saved.",
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-neutral-600">
          Manage your account preferences and settings
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8">
        {/* Notification Settings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Choose how and when you want to be notified
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <Label htmlFor="emailNotifications" className="font-medium">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-neutral-500">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={notifications.email}
                  onCheckedChange={() => handleNotificationToggle("email")}
                />
              </div>
              
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <Label htmlFor="smsNotifications" className="font-medium">
                    SMS Notifications
                  </Label>
                  <p className="text-sm text-neutral-500">
                    Receive notifications via text message
                  </p>
                </div>
                <Switch
                  id="smsNotifications"
                  checked={notifications.sms}
                  onCheckedChange={() => handleNotificationToggle("sms")}
                />
              </div>
              
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <Label htmlFor="statusUpdates" className="font-medium">
                    Status Updates
                  </Label>
                  <p className="text-sm text-neutral-500">
                    Get notified when your item's status changes
                  </p>
                </div>
                <Switch
                  id="statusUpdates"
                  checked={notifications.statusUpdates}
                  onCheckedChange={() => handleNotificationToggle("statusUpdates")}
                />
              </div>
              
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <Label htmlFor="payoutNotifications" className="font-medium">
                    Payout Notifications
                  </Label>
                  <p className="text-sm text-neutral-500">
                    Get notified about payouts and earnings
                  </p>
                </div>
                <Switch
                  id="payoutNotifications"
                  checked={notifications.payoutNotifications}
                  onCheckedChange={() => handleNotificationToggle("payoutNotifications")}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="marketingEmails" className="font-medium">
                    Marketing Emails
                  </Label>
                  <p className="text-sm text-neutral-500">
                    Receive marketing and promotional emails
                  </p>
                </div>
                <Switch
                  id="marketingEmails"
                  checked={notifications.marketingEmails}
                  onCheckedChange={() => handleNotificationToggle("marketingEmails")}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Payment Preferences */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Payment Preferences</CardTitle>
            <CardDescription>
              Configure your default payout method and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="defaultPayoutMethod">Default Payout Method</Label>
                <Select 
                  value={defaultPayoutMethod} 
                  onValueChange={setDefaultPayoutMethod}
                >
                  <SelectTrigger id="defaultPayoutMethod">
                    <SelectValue placeholder="Select payout method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Payout Methods</SelectLabel>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="storecredit">Store Credit (+10% bonus)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                
                {defaultPayoutMethod === "bank" && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountType">Account Type</Label>
                      <Select 
                        value={bankDetails.accountType} 
                        onValueChange={(value) => setBankDetails({ ...bankDetails, accountType: value })}
                      >
                        <SelectTrigger id="accountType">
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checking">Checking Account</SelectItem>
                          <SelectItem value="savings">Savings Account</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select 
                        value={bankDetails.currency} 
                        onValueChange={(value) => setBankDetails({ ...bankDetails, currency: value })}
                      >
                        <SelectTrigger id="currency">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eur">Euro (EUR)</SelectItem>
                          <SelectItem value="usd">US Dollar (USD)</SelectItem>
                          <SelectItem value="gbp">British Pound (GBP)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                
                {defaultPayoutMethod === "storecredit" && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      Choosing store credit gives you a 10% bonus on all your payouts.
                      Store credit can be used for any purchase at Dutch Thrift.
                    </p>
                  </div>
                )}
              </div>
              
              <Button onClick={handleSavePayoutPreferences}>
                Save Payout Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Privacy Settings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Privacy Settings</CardTitle>
            <CardDescription>
              Control how your data is used and shared
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <Label htmlFor="shareAnalytics" className="font-medium">
                    Share Analytics Data
                  </Label>
                  <p className="text-sm text-neutral-500">
                    Help us improve our service with anonymous usage data
                  </p>
                </div>
                <Switch
                  id="shareAnalytics"
                  checked={privacySettings.shareAnalytics}
                  onCheckedChange={() => setPrivacySettings(prev => ({ ...prev, shareAnalytics: !prev.shareAnalytics }))}
                />
              </div>
              
              <div className="flex items-center justify-between pb-3">
                <div>
                  <Label htmlFor="shareContactInfo" className="font-medium">
                    Share Contact Info with Partners
                  </Label>
                  <p className="text-sm text-neutral-500">
                    Allow partner businesses to contact you with relevant offers
                  </p>
                </div>
                <Switch
                  id="shareContactInfo"
                  checked={privacySettings.shareContactInfo}
                  onCheckedChange={() => setPrivacySettings(prev => ({ ...prev, shareContactInfo: !prev.shareContactInfo }))}
                />
              </div>
              
              <Button onClick={handleSavePrivacySettings}>
                Save Privacy Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>
              Manage your account session and security
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                variant="destructive" 
                className="w-full sm:w-auto flex items-center"
                onClick={() => {
                  // Create a simple form for a POST logout request
                  const form = document.createElement('form');
                  form.method = 'POST';
                  form.action = '/api/auth/logout';
                  
                  // Add a hidden field for CSRF protection
                  const hiddenField = document.createElement('input');
                  hiddenField.type = 'hidden';
                  hiddenField.name = '_logout';
                  hiddenField.value = Date.now().toString();
                  form.appendChild(hiddenField);
                  
                  // Add the form to the page and submit it
                  document.body.appendChild(form);
                  form.submit();
                  
                  // Fallback: redirect after a short delay
                  setTimeout(() => {
                    window.location.href = '/auth';
                  }, 1000);
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
              
              <p className="text-sm text-gray-500">
                Logging out will end your current session and return you to the login screen.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}