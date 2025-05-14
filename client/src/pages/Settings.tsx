import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Store, 
  Truck, 
  CreditCard, 
  BellRing, 
  UserCog,
  Key,
  ShieldCheck,
  LockIcon,
  Save,
  PlusCircle,
  Edit3,
  Trash2,
  AlertTriangle,
  Building2
} from "lucide-react";

// Form schema for company settings
const companySettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  websiteUrl: z.string().url("Invalid URL format").optional(),
  logoUrl: z.string().optional(),
});

// Form schema for API integrations
const apiIntegrationsSchema = z.object({
  shopifyApiKey: z.string().min(1, "API key is required"),
  shopifyApiSecret: z.string().min(1, "API secret is required"),
  shopifyStoreUrl: z.string().url("Invalid URL format"),
  openaiApiKey: z.string().min(1, "API key is required"),
  ebayAppId: z.string().min(1, "Application ID is required"),
  ebayCertId: z.string().min(1, "Certificate ID is required"),
  sendcloudApiKey: z.string().min(1, "API key is required"),
  sendcloudSecret: z.string().min(1, "API secret is required"),
  stripePublishableKey: z.string().min(1, "Publishable key is required"),
  stripeSecretKey: z.string().min(1, "Secret key is required"),
});

// Form schema for consignment settings
const consignmentSettingsSchema = z.object({
  commissionRate: z.number().min(0).max(100),
  minimumSalePrice: z.number().min(0),
  maximumConsignmentPeriod: z.number().min(1),
  autoPayConsignors: z.boolean(),
  paymentThreshold: z.number().min(0),
});

export default function Settings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("company");
  
  // Company settings form
  const companyForm = useForm<z.infer<typeof companySettingsSchema>>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      companyName: "Consignment Store",
      email: "support@consignmentstore.com",
      phone: "(555) 123-4567",
      address: "123 Main Street",
      city: "Anytown",
      state: "CA",
      postalCode: "12345",
      country: "US",
      websiteUrl: "https://consignmentstore.com",
      logoUrl: "",
    },
  });
  
  // API integrations form
  const apiForm = useForm<z.infer<typeof apiIntegrationsSchema>>({
    resolver: zodResolver(apiIntegrationsSchema),
    defaultValues: {
      shopifyApiKey: "********",
      shopifyApiSecret: "********",
      shopifyStoreUrl: "https://your-store.myshopify.com",
      openaiApiKey: "sk_********", 
      ebayAppId: "********",
      ebayCertId: "********",
      sendcloudApiKey: "********",
      sendcloudSecret: "********",
      stripePublishableKey: "pk_********",
      stripeSecretKey: "sk_********",
    },
  });
  
  // Consignment settings form
  const consignmentForm = useForm<z.infer<typeof consignmentSettingsSchema>>({
    resolver: zodResolver(consignmentSettingsSchema),
    defaultValues: {
      commissionRate: 20,
      minimumSalePrice: 25,
      maximumConsignmentPeriod: 90,
      autoPayConsignors: true,
      paymentThreshold: 50,
    },
  });
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [newSaleNotification, setNewSaleNotification] = useState(true);
  const [payoutNotification, setPayoutNotification] = useState(true);
  const [inventoryAlerts, setInventoryAlerts] = useState(true);
  
  // Submit forms
  const onCompanySubmit = (data: z.infer<typeof companySettingsSchema>) => {
    // In a real implementation, this would update company settings
    console.log("Company settings:", data);
    toast({
      title: "Settings updated",
      description: "Your company settings have been saved",
    });
  };
  
  const onApiSubmit = (data: z.infer<typeof apiIntegrationsSchema>) => {
    // In a real implementation, this would update API integrations
    console.log("API settings:", data);
    toast({
      title: "API settings updated",
      description: "Your API integrations have been saved",
    });
  };
  
  const onConsignmentSubmit = (data: z.infer<typeof consignmentSettingsSchema>) => {
    // In a real implementation, this would update consignment settings
    console.log("Consignment settings:", data);
    toast({
      title: "Consignment settings updated",
      description: "Your consignment settings have been saved",
    });
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium">Platform Settings</h1>
      </div>
      
      <Tabs defaultValue="company" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid grid-cols-1 md:grid-cols-5 w-full">
          <TabsTrigger value="company" className="flex items-center">
            <Store className="h-4 w-4 mr-2" /> Company
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center">
            <Key className="h-4 w-4 mr-2" /> API Integrations
          </TabsTrigger>
          <TabsTrigger value="consignment" className="flex items-center">
            <Truck className="h-4 w-4 mr-2" /> Consignment
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center">
            <CreditCard className="h-4 w-4 mr-2" /> Payment
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center">
            <BellRing className="h-4 w-4 mr-2" /> Notifications
          </TabsTrigger>
        </TabsList>
        
        {/* Company Settings */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Update your company information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...companyForm}>
                <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={companyForm.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={companyForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={companyForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={companyForm.control}
                      name="websiteUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website URL</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-sm font-medium mb-4">Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={companyForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={companyForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={companyForm.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={companyForm.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={companyForm.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-sm font-medium mb-4">Logo</h3>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-neutral-100 rounded-md flex items-center justify-center text-neutral-500">
                        <Store className="h-8 w-8" />
                      </div>
                      <div>
                        <Button type="button" variant="outline" className="mb-2">Upload New Logo</Button>
                        <p className="text-xs text-neutral-500">
                          Recommended size: 400x400px. Max file size: 5MB
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <CardFooter className="flex justify-end pt-4 px-0">
                    <Button type="submit" className="flex items-center">
                      <Save className="h-4 w-4 mr-2" /> Save Changes
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* API Integrations */}
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Integrations</CardTitle>
              <CardDescription>
                Configure the API keys for external service integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...apiForm}>
                <form onSubmit={apiForm.handleSubmit(onApiSubmit)} className="space-y-6">
                  {/* Shopify Integration */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-md font-medium">Shopify</h3>
                      <Badge className="bg-green-100 text-green-800">Connected</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={apiForm.control}
                        name="shopifyApiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={apiForm.control}
                        name="shopifyApiSecret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Secret</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={apiForm.control}
                        name="shopifyStoreUrl"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Store URL</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* OpenAI Integration */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-md font-medium">OpenAI</h3>
                      <Badge className="bg-green-100 text-green-800">Connected</Badge>
                    </div>
                    <FormField
                      control={apiForm.control}
                      name="openaiApiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormDescription>
                            Used for product image analysis with GPT-4 Vision
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  {/* eBay Integration */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-md font-medium">eBay</h3>
                      <Badge className="bg-amber-100 text-amber-800">Partially Connected</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={apiForm.control}
                        name="ebayAppId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Application ID</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={apiForm.control}
                        name="ebayCertId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Certificate ID</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <p className="text-xs text-amber-700 mt-2">
                      <AlertTriangle className="h-3 w-3 inline-block mr-1" />
                      OAuth token missing. You need to complete the authorization process.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  {/* Sendcloud Integration */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-md font-medium">Sendcloud</h3>
                      <Badge className="bg-gray-100 text-gray-800">Not Connected</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={apiForm.control}
                        name="sendcloudApiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={apiForm.control}
                        name="sendcloudSecret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Secret</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Stripe Integration */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-md font-medium">Stripe</h3>
                      <Badge className="bg-gray-100 text-gray-800">Not Connected</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={apiForm.control}
                        name="stripePublishableKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Publishable Key</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={apiForm.control}
                        name="stripeSecretKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secret Key</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <CardFooter className="flex justify-end pt-4 px-0">
                    <Button type="submit" className="flex items-center">
                      <Save className="h-4 w-4 mr-2" /> Save API Settings
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Consignment Settings */}
        <TabsContent value="consignment">
          <Card>
            <CardHeader>
              <CardTitle>Consignment Settings</CardTitle>
              <CardDescription>
                Configure your consignment policies and pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...consignmentForm}>
                <form onSubmit={consignmentForm.handleSubmit(onConsignmentSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={consignmentForm.control}
                      name="commissionRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Commission Rate (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="100" 
                              {...field} 
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Percentage of sale price retained by your company
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={consignmentForm.control}
                      name="minimumSalePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Sale Price ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              {...field} 
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Minimum price for consigned items
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={consignmentForm.control}
                      name="maximumConsignmentPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Consignment Period (days)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              {...field} 
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Number of days before items are returned or donated
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={consignmentForm.control}
                      name="paymentThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Threshold ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              {...field} 
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Minimum amount before automatic payouts are processed
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  <FormField
                    control={consignmentForm.control}
                    name="autoPayConsignors"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Automatic Payouts</FormLabel>
                          <FormDescription>
                            Automatically process payouts when an item is sold
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-md font-medium mb-4">Item Categories</h3>
                    <div className="rounded-md border border-neutral-200">
                      <div className="p-4 flex items-center justify-between border-b border-neutral-200">
                        <div>
                          <p className="text-sm font-medium">Electronics</p>
                          <p className="text-xs text-neutral-500">Cameras, Audio Equipment, Gadgets</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between border-b border-neutral-200">
                        <div>
                          <p className="text-sm font-medium">Clothing</p>
                          <p className="text-xs text-neutral-500">Designer Clothes, Shoes, Accessories</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Gaming</p>
                          <p className="text-xs text-neutral-500">Consoles, Games, Accessories</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Button type="button" variant="outline" className="mt-4 flex items-center">
                      <PlusCircle className="h-4 w-4 mr-2" /> Add Category
                    </Button>
                  </div>
                  
                  <CardFooter className="flex justify-end pt-4 px-0">
                    <Button type="submit" className="flex items-center">
                      <Save className="h-4 w-4 mr-2" /> Save Settings
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Payment Settings */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>
                Configure payment methods and payout settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Payment Methods */}
                <div>
                  <h3 className="text-md font-medium mb-4">Payment Methods</h3>
                  <div className="rounded-md border border-neutral-200">
                    <div className="p-4 flex items-center justify-between border-b border-neutral-200">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-md bg-blue-100 flex items-center justify-center mr-3">
                          <CreditCard className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Stripe</p>
                          <p className="text-xs text-neutral-500">Credit/Debit Card Payments</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="p-4 flex items-center justify-between border-b border-neutral-200">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-md bg-blue-100 flex items-center justify-center mr-3">
                          <BankIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Bank Transfers</p>
                          <p className="text-xs text-neutral-500">ACH/Wire Transfers to Consignors</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-md bg-neutral-100 flex items-center justify-center mr-3">
                          <div className="text-xs text-neutral-500 font-medium">PP</div>
                        </div>
                        <div>
                          <p className="text-sm font-medium">PayPal</p>
                          <p className="text-xs text-neutral-500">PayPal Payments</p>
                        </div>
                      </div>
                      <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="mt-4 flex items-center">
                    <PlusCircle className="h-4 w-4 mr-2" /> Add Payment Method
                  </Button>
                </div>
                
                <Separator />
                
                {/* Tax Information */}
                <div>
                  <h3 className="text-md font-medium mb-4">Tax Information</h3>
                  <div className="rounded-md border border-neutral-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium">Tax ID</p>
                        <p className="text-xs text-neutral-500">EIN: XX-XXXXXXX</p>
                      </div>
                      <Button variant="outline" size="sm">Update</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Tax Rate</p>
                        <p className="text-xs text-neutral-500">8.25% (California)</p>
                      </div>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Payout Schedule */}
                <div>
                  <h3 className="text-md font-medium mb-4">Payout Schedule</h3>
                  <div className="rounded-md border border-neutral-200 p-4 space-y-4">
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Automatic Payouts</p>
                        <Switch checked={true} />
                      </div>
                      <p className="text-xs text-neutral-500">
                        Process payouts automatically when threshold is reached
                      </p>
                    </div>
                    
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Payout Frequency</p>
                        <select className="rounded-md border border-neutral-200 text-sm px-2 py-1">
                          <option>Weekly (Monday)</option>
                          <option>Bi-Weekly</option>
                          <option>Monthly</option>
                        </select>
                      </div>
                      <p className="text-xs text-neutral-500">
                        How often payouts are processed for consignors
                      </p>
                    </div>
                    
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Holding Period</p>
                        <select className="rounded-md border border-neutral-200 text-sm px-2 py-1">
                          <option>14 days</option>
                          <option>30 days</option>
                          <option>45 days</option>
                        </select>
                      </div>
                      <p className="text-xs text-neutral-500">
                        Time to hold funds after a sale before releasing to consignor
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button className="flex items-center">
                    <Save className="h-4 w-4 mr-2" /> Save Payment Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure when and how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Notification Methods */}
                <div>
                  <h3 className="text-md font-medium mb-4">Notification Methods</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <p className="text-base">Email Notifications</p>
                        <p className="text-sm text-neutral-500">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch 
                        checked={emailNotifications} 
                        onCheckedChange={setEmailNotifications} 
                      />
                    </div>
                    
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <p className="text-base">SMS Notifications</p>
                        <p className="text-sm text-neutral-500">
                          Receive notifications via text message
                        </p>
                      </div>
                      <Switch 
                        checked={smsNotifications} 
                        onCheckedChange={setSmsNotifications} 
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Notification Types */}
                <div>
                  <h3 className="text-md font-medium mb-4">Notification Types</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <p className="text-base">New Sale Alerts</p>
                        <p className="text-sm text-neutral-500">
                          Get notified when an item is sold
                        </p>
                      </div>
                      <Switch 
                        checked={newSaleNotification} 
                        onCheckedChange={setNewSaleNotification} 
                      />
                    </div>
                    
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <p className="text-base">Payout Notifications</p>
                        <p className="text-sm text-neutral-500">
                          Get notified when payouts are processed
                        </p>
                      </div>
                      <Switch 
                        checked={payoutNotification} 
                        onCheckedChange={setPayoutNotification} 
                      />
                    </div>
                    
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <p className="text-base">Inventory Alerts</p>
                        <p className="text-sm text-neutral-500">
                          Get notified about inventory status changes
                        </p>
                      </div>
                      <Switch 
                        checked={inventoryAlerts} 
                        onCheckedChange={setInventoryAlerts} 
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button className="flex items-center">
                    <Save className="h-4 w-4 mr-2" /> Save Notification Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}