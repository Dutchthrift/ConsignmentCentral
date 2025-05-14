import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  SlidersHorizontal, 
  Calendar, 
  Download,
  DollarSign,
  FileText,
  ArrowUpDown,
  CheckCircle,
  Clock,
  MoreVertical,
  Building2, // Replacing BankIcon
  CreditCard,
} from "lucide-react";

export default function Payouts() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Simulate payouts data - in a real implementation this would come from an API
  const isLoading = false;
  const mockPayouts = [
    {
      id: "PYT-123456",
      consignor: {
        id: 1,
        name: "Jane Cooper",
        email: "jane.cooper@example.com",
      },
      amountPaid: 189.99,
      amountDue: 0,
      items: 1,
      method: "Bank Transfer",
      date: "2025-05-01T10:30:00Z",
      status: "completed",
    },
    {
      id: "PYT-123455",
      consignor: {
        id: 2,
        name: "Alex Morgan",
        email: "alex.morgan@example.com",
      },
      amountPaid: 0,
      amountDue: 145.50,
      items: 1,
      method: "Pending",
      date: "2025-04-28T14:15:00Z",
      status: "pending",
    },
    {
      id: "PYT-123454",
      consignor: {
        id: 3,
        name: "Robert Johnson",
        email: "robert.johnson@example.com",
      },
      amountPaid: 0,
      amountDue: 220.50,
      items: 1,
      method: "Pending",
      date: "2025-04-25T11:00:00Z",
      status: "pending",
    },
    {
      id: "PYT-123453",
      consignor: {
        id: 4,
        name: "Sarah Williams",
        email: "sarah.williams@example.com",
      },
      amountPaid: 99.50,
      amountDue: 0,
      items: 1,
      method: "PayPal",
      date: "2025-04-20T09:45:00Z",
      status: "completed",
    },
  ];
  
  // Calculate summary statistics
  const totalPaid = mockPayouts.reduce((sum, payout) => sum + payout.amountPaid, 0);
  const totalPending = mockPayouts.reduce((sum, payout) => sum + payout.amountDue, 0);
  const pendingPayoutsCount = mockPayouts.filter(payout => payout.status === "pending").length;
  
  // Filter payouts based on search query and active tab
  const filteredPayouts = mockPayouts.filter(payout => {
    const matchesSearch = !searchQuery || 
      payout.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payout.consignor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payout.consignor.email.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesTab = activeTab === "all" || 
      (activeTab === "pending" && payout.status === "pending") ||
      (activeTab === "completed" && payout.status === "completed");
      
    return matchesSearch && matchesTab;
  });
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    }).format(date);
  };
  
  // Status badges
  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800",
      processing: "bg-blue-100 text-blue-800",
      completed: "bg-emerald-100 text-emerald-800",
    };
    
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    
    return (
      <Badge variant="outline" className={`${statusColors[status] || "bg-gray-100 text-gray-800"}`}>
        {statusText}
      </Badge>
    );
  };
  
  // Get action button based on payout status
  const getActionButton = (payout: any) => {
    switch (payout.status) {
      case "pending":
        return (
          <Button size="sm" className="flex items-center mr-2">
            <DollarSign className="h-4 w-4 mr-1" /> Process Payout
          </Button>
        );
      case "completed":
        return (
          <Button size="sm" variant="outline" className="flex items-center mr-2">
            <FileText className="h-4 w-4 mr-1" /> Receipt
          </Button>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Total Paid Out</p>
                <p className="text-2xl font-semibold">${totalPaid.toFixed(2)}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Pending Payouts</p>
                <p className="text-2xl font-semibold">${totalPending.toFixed(2)}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Waiting for Payment</p>
                <p className="text-2xl font-semibold">{pendingPayoutsCount} Consignors</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main payouts table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">Consignor Payouts</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" className="flex items-center">
              <CreditCard className="h-4 w-4 mr-1" /> Batch Pay
            </Button>
            <Button className="flex items-center">
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
              <Input
                placeholder="Search by consignor or payout ID..."
                className="pl-8"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Date Range
              </Button>
              <Button variant="outline" className="flex items-center">
                <SlidersHorizontal className="h-4 w-4 mr-1" />
                Filters
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Payouts</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab}>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                        Payout ID <Button variant="ghost" size="sm" className="p-0 h-auto">
                          <ArrowUpDown className="h-3 w-3 text-neutral-400" />
                        </Button>
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                        Consignor
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                        Items
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                        Method
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      // Loading state
                      Array(5)
                        .fill(0)
                        .map((_, index) => (
                          <tr key={index} className="border-b border-neutral-200">
                            <td className="py-3 px-4">
                              <Skeleton className="h-4 w-24" />
                            </td>
                            <td className="py-3 px-4">
                              <Skeleton className="h-4 w-32" />
                            </td>
                            <td className="py-3 px-4">
                              <Skeleton className="h-4 w-24" />
                            </td>
                            <td className="py-3 px-4">
                              <Skeleton className="h-4 w-16" />
                            </td>
                            <td className="py-3 px-4">
                              <Skeleton className="h-4 w-8" />
                            </td>
                            <td className="py-3 px-4">
                              <Skeleton className="h-4 w-24" />
                            </td>
                            <td className="py-3 px-4">
                              <Skeleton className="h-5 w-16 rounded-full" />
                            </td>
                            <td className="py-3 px-4">
                              <Skeleton className="h-8 w-20 rounded" />
                            </td>
                          </tr>
                        ))
                    ) : filteredPayouts.length > 0 ? (
                      // Actual data
                      filteredPayouts.map((payout) => (
                        <tr
                          key={payout.id}
                          className="border-b border-neutral-200 hover:bg-neutral-50"
                        >
                          <td className="py-3 px-4 font-medium text-sm">
                            {payout.id}
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-sm">{payout.consignor.name}</p>
                              <p className="text-xs text-neutral-500">{payout.consignor.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-neutral-600">
                            {formatDate(payout.date)}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium">
                            {payout.status === "completed" 
                              ? `$${payout.amountPaid.toFixed(2)}` 
                              : `$${payout.amountDue.toFixed(2)}`}
                          </td>
                          <td className="py-3 px-4 text-sm text-neutral-600">
                            {payout.items}
                          </td>
                          <td className="py-3 px-4 text-sm text-neutral-600">
                            {payout.method}
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(payout.status)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              {getActionButton(payout)}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-neutral-500 hover:text-primary"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      // No data state
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-neutral-500">
                          {searchQuery 
                            ? "No payouts match your search criteria" 
                            : "No payouts found in this category"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}