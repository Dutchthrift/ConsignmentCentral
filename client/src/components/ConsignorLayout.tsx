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
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Sidebar - hidden on mobile, visible on desktop */}
      <aside className="hidden md:flex md:w-64 flex-col bg-white border-r border-neutral-200 p-4">
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
            variant={location === "/consignor" ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link to="/consignor">
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
            variant={location === "/consignor/history" ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start"
            asChild
          >
            <Link to="/consignor/history">
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
      
      {/* Mobile nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-neutral-200 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <img src="/assets/logo.svg" alt="Dutch Thrift" className="h-6 w-auto" />
            <span className="font-bold">Dutch Thrift</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="h-6 w-6"
            >
              {isMenuOpen ? (
                <path d="M18 6 6 18M6 6l12 12"/>
              ) : (
                <path d="M4 12h16M4 6h16M4 18h16"/>
              )}
            </svg>
          </Button>
        </div>
        
        {isMenuOpen && (
          <nav className="p-4 bg-white border-b border-neutral-200 space-y-2">
            <Button
              variant={location === "/consignor" ? "default" : "ghost"}
              size="sm"
              className="w-full justify-start"
              asChild
            >
              <Link to="/consignor" onClick={() => setIsMenuOpen(false)}>
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
              <Link to="/consignor/new-item" onClick={() => setIsMenuOpen(false)}>
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
              <Link to="/consignor/items" onClick={() => setIsMenuOpen(false)}>
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
              <Link to="/consignor/orders" onClick={() => setIsMenuOpen(false)}>
                <ShoppingBag className="mr-2 h-4 w-4" />
                Orders
              </Link>
            </Button>
            
            <Button
              variant={location === "/consignor/history" ? "default" : "ghost"}
              size="sm"
              className="w-full justify-start"
              asChild
            >
              <Link to="/consignor/history" onClick={() => setIsMenuOpen(false)}>
                <History className="mr-2 h-4 w-4" />
                Sales History
              </Link>
            </Button>
            
            {/* Insights page removed from mobile menu */}
            
            <Button
              variant={location === "/consignor/payouts" ? "default" : "ghost"}
              size="sm"
              className="w-full justify-start"
              asChild
            >
              <Link to="/consignor/payouts" onClick={() => setIsMenuOpen(false)}>
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
              <Link to="/consignor/profile" onClick={() => setIsMenuOpen(false)}>
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
              <Link to="/consignor/settings" onClick={() => setIsMenuOpen(false)}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-neutral-700"
              onClick={() => {
                handleLogout();
                setIsMenuOpen(false);
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </nav>
        )}
      </div>
      
      {/* Main content */}
      <main className="flex-1 px-4 md:px-8 py-4 md:py-8 mt-16 md:mt-0">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}