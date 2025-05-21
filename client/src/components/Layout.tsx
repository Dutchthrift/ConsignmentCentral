import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
// Use a placeholder for the logo, as we don't have direct access to the asset
const logoPath = "/assets/logo.svg";

// Icons
import {
  LayoutDashboard,
  PackagePlus,
  Package,
  ReceiptText,
  Wallet,
  Settings,
  Menu,
  X,
  HelpCircle,
  Bell,
  Brain,
  Users,
  LogOut
} from "lucide-react";

type MenuItem = {
  icon: React.ReactNode;
  label: string;
  path: string;
};

const menuItems: MenuItem[] = [
  { icon: <LayoutDashboard className="mr-2 h-5 w-5" />, label: "Dashboard", path: "/" },
  { icon: <PackagePlus className="mr-2 h-5 w-5" />, label: "New Intake", path: "/intake" },
  { icon: <Package className="mr-2 h-5 w-5" />, label: "Inventory", path: "/inventory" },
  { icon: <ReceiptText className="mr-2 h-5 w-5" />, label: "Orders", path: "/orders" },
  { icon: <Wallet className="mr-2 h-5 w-5" />, label: "Payouts", path: "/payouts" },
  { icon: <Users className="mr-2 h-5 w-5" />, label: "Consignors", path: "/consignors" },
  { icon: <Brain className="mr-2 h-5 w-5" />, label: "Model Training", path: "/model-training" },
  { icon: <HelpCircle className="mr-2 h-5 w-5" />, label: "Help", path: "/help" },
  { icon: <Settings className="mr-2 h-5 w-5" />, label: "Settings", path: "/settings" },
  { icon: <Bell className="mr-2 h-5 w-5" />, label: "System Health", path: "/system-health" },
];

type LayoutProps = {
  children: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { logout, user } = useAuth();
  const { toast } = useToast();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
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
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="bg-neutral-800 text-white w-64 flex-shrink-0 hidden md:flex flex-col">
        <div className="p-4 flex flex-col items-center justify-center border-b border-neutral-700">
          <img src={logoPath} alt="Dutch Thrift Logo" className="h-16 mb-2" />
          <h1 className="text-xl font-medium text-center">Consignment Portal</h1>
        </div>
        
        <nav className="mt-4 flex-1">
          <ul>
            {menuItems.map((item, index) => (
              <li key={index}>
                <Link 
                  href={item.path}
                  className={`flex items-center px-4 py-3 ${
                    location === item.path
                      ? "bg-primary hover:bg-primary-dark text-white"
                      : "hover:bg-neutral-700"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-neutral-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white text-sm font-medium">{user?.name?.charAt(0) || "A"}</span>
              </div>
              <div className="ml-2">
                <p className="text-sm font-medium">{user?.name || "Admin"}</p>
                <p className="text-xs text-neutral-400">Administrator</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-neutral-400 hover:text-white hover:bg-neutral-700"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden bg-primary text-white w-full h-16 fixed top-0 left-0 z-10 flex items-center justify-between px-4">
        <div className="flex items-center">
          <button onClick={toggleMobileMenu} className="mr-2">
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center">
            <img src={logoPath} alt="Dutch Thrift Logo" className="h-10 mr-2" />
            <h1 className="text-lg font-medium">Dutch Thrift</h1>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
          <span className="text-primary text-sm font-medium">JD</span>
        </div>
      </div>

      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden">
          <div className="bg-neutral-800 text-white w-64 h-full overflow-y-auto">
            <div className="p-4 flex items-center justify-between border-b border-neutral-700">
              <div className="flex items-center">
                <img src={logoPath} alt="Dutch Thrift Logo" className="h-10 mr-2" />
                <h1 className="text-xl font-medium">Dutch Thrift</h1>
              </div>
              <button onClick={toggleMobileMenu}>
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <nav className="mt-4">
              <ul>
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <Link 
                      href={item.path}
                      className={`flex items-center px-4 py-3 ${
                        location === item.path
                          ? "bg-primary hover:bg-primary-dark text-white"
                          : "hover:bg-neutral-700"
                      }`}
                      onClick={toggleMobileMenu}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
                
                {/* Logout Button */}
                <li>
                  <button
                    onClick={() => {
                      toggleMobileMenu();
                      handleLogout();
                    }}
                    className="flex items-center px-4 py-3 w-full text-left hover:bg-neutral-700"
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm hidden md:block">
          <div className="px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-medium">
              {location === "/" && "Dashboard"}
              {location === "/intake" && "New Intake"}
              {location === "/model-training" && "Model Training"}
              {location === "/consignors" && "Consignors"}
              {location.includes("/dashboard/") && "Customer Dashboard"}
            </h1>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Bell className="h-5 w-5 text-neutral-600" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-secondary rounded-full"></span>
              </div>
              <div>
                <HelpCircle className="h-5 w-5 text-neutral-600" />
              </div>
              <Button 
                variant="outline" 
                className="flex items-center gap-2" 
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" /> 
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main content container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-20 md:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
