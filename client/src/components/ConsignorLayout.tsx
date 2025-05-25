import { useState } from "react";
import { Link, useLocation } from "wouter";
import { UserRound, Package, BarChart3, Settings, LogOut, History, CreditCard, PieChart, ChartBar, ShoppingBag, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface ConsignorLayoutProps {
  children: React.ReactNode;
}

export default function ConsignorLayout({ children }: ConsignorLayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { logout } = useAuth();
  
  const handleLogout = () => {
    // Show a toast for better UX
    toast({
      title: "Logging out...",
      description: "Please wait while we securely log you out."
    });
    
    // Call the logout mutation from useAuth
    logout.mutate(undefined, {
      onSuccess: () => {
        // Clear all client storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to login page
        window.location.href = '/auth';
      },
      onError: () => {
        // Even if the API call fails, still redirect to login
        // and clear storage as fallback
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/auth';
        
        console.log('Logout API request failed, forcing redirect');
      }
    });
  };

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Sidebar - always visible */}
      <aside className="flex w-64 flex-col bg-white border-r border-neutral-200 p-4">
        <div className="mb-8 flex items-center gap-3 px-2">
          <img 
            src="/assets/logo.svg" 
            alt="Dutch Thrift" 
            className="h-8 w-auto"
          />
          <h1 className="font-bold text-lg">Dutch Thrift</h1>
        </div>
        
        <div className="mb-6 px-2">
          <div className="flex items-center gap-3 mb-3">
            <Avatar>
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary text-white">
                {user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user?.name}</p>
              <p className="text-sm text-neutral-500">{user?.email}</p>
            </div>
          </div>
        </div>
        
        <nav className="space-y-1 flex-1">
          <Button
            variant={location === "/consignor/dashboard" ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link to="/consignor/dashboard">
              <BarChart3 className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          
          <Button
            variant={location === "/consignor/new-item" ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link to="/consignor/new-item">
              <PlusCircle className="mr-2 h-4 w-4" />
              Submit New Item
            </Link>
          </Button>
          
          <Button
            variant={location === "/consignor/items" ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link to="/consignor/items">
              <Package className="mr-2 h-4 w-4" />
              My Items
            </Link>
          </Button>
          
          <Button
            variant={location === "/consignor/orders" ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link to="/consignor/orders">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Orders
            </Link>
          </Button>
          
          <Button
            variant={location === "/consignor/sales" ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link to="/consignor/sales">
              <History className="mr-2 h-4 w-4" />
              Sales History
            </Link>
          </Button>
          
          {/* Insights page removed */}
          
          <Button
            variant={location === "/consignor/payouts" ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link to="/consignor/payouts">
              <CreditCard className="mr-2 h-4 w-4" />
              Payouts
            </Link>
          </Button>
          
          <Button
            variant={location === "/consignor/profile" ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link to="/consignor/profile">
              <UserRound className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </Button>
          
          <Button
            variant={location === "/consignor/settings" ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link to="/consignor/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </nav>
        
        <div className="mt-auto pt-4">
          {/* Gebruikersbadge */}
          <div className="mb-3 p-3 bg-neutral-100 rounded-md">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-primary text-white text-xs">
                  {user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-neutral-500">Consignor</p>
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-neutral-700"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
      

      
      {/* Main content */}
      <main className="flex-1 px-8 py-8">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}