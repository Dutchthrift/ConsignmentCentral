import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";

// Import logo
import logoPath from "../assets/logo.png";

// Icons
import {
  LayoutDashboard,
  PackagePlus,
  ShoppingBag,
  Wallet,
  LogOut,
  Menu,
  X,
  HelpCircle,
  Bell,
  User,
  Settings,
} from "lucide-react";

type MenuItem = {
  icon: React.ReactNode;
  label: string;
  path: string;
};

const menuItems: MenuItem[] = [
  { icon: <LayoutDashboard className="mr-2 h-5 w-5" />, label: "Dashboard", path: "/consignor/dashboard" },
  { icon: <PackagePlus className="mr-2 h-5 w-5" />, label: "Submit Item", path: "/consignor/submit" },
  { icon: <ShoppingBag className="mr-2 h-5 w-5" />, label: "My Items", path: "/consignor/items" },
  { icon: <Wallet className="mr-2 h-5 w-5" />, label: "Payouts", path: "/consignor/payouts" },
  { icon: <Settings className="mr-2 h-5 w-5" />, label: "Settings", path: "/consignor/settings" },
];

type LayoutProps = {
  children: React.ReactNode;
};

export default function ConsignorLayout({ children }: LayoutProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get user data from the auth hook
  const { user, logoutMutation } = useAuth();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="bg-primary text-white w-64 flex-shrink-0 hidden md:flex flex-col">
        <div className="p-4 flex flex-col items-center justify-center border-b border-primary-dark/30">
          <img src={logoPath} alt="Dutch Thrift Logo" className="h-16 mb-2" />
          <h1 className="text-xl font-medium text-center">Consignor Portal</h1>
        </div>
        
        <nav className="mt-4 flex-1">
          <ul>
            {menuItems.map((item, index) => (
              <li key={index}>
                <Link 
                  href={item.path}
                  className={`flex items-center px-4 py-3 ${
                    location === item.path
                      ? "bg-primary-dark hover:bg-primary-dark text-white"
                      : "hover:bg-primary-dark/50"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-primary-dark/30">
          <button 
            onClick={handleLogout}
            className="flex items-center text-white hover:text-gray-200 w-full px-4 py-2 rounded-md hover:bg-primary-dark/50"
          >
            <LogOut className="mr-2 h-5 w-5" />
            <span>Logout</span>
          </button>
          
          <Separator className="my-4 bg-primary-dark/30" />
          
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="ml-2">
              <p className="text-sm font-medium">{user?.name || "Consignor"}</p>
              <p className="text-xs text-white/70">{user?.email || ""}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden bg-primary text-white w-full h-16 fixed top-0 left-0 z-10 flex items-center justify-between px-4">
        <div className="flex items-center">
          <button onClick={toggleMobileMenu} className="mr-2">
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-medium">Consignor Portal</h1>
        </div>
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
          <User className="h-4 w-4 text-primary" />
        </div>
      </div>

      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden">
          <div className="bg-primary text-white w-64 h-full overflow-y-auto">
            <div className="p-4 flex items-center justify-between border-b border-primary-dark/30">
              <div className="flex items-center">
                <img src={logoPath} alt="Dutch Thrift Logo" className="h-8 mr-2" />
                <h1 className="text-lg font-medium">Consignor Portal</h1>
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
                          ? "bg-primary-dark hover:bg-primary-dark text-white"
                          : "hover:bg-primary-dark/50"
                      }`}
                      onClick={toggleMobileMenu}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              
              <Separator className="my-4 bg-primary-dark/30" />
              
              <button 
                onClick={handleLogout}
                className="flex items-center text-white hover:text-gray-200 w-full px-4 py-3"
              >
                <LogOut className="mr-2 h-5 w-5" />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm hidden md:block">
          <div className="px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-medium">
              {location === "/consignor/dashboard" && "Dashboard"}
              {location === "/consignor/submit" && "Submit New Item"}
              {location === "/consignor/items" && "My Items"}
              {location === "/consignor/payouts" && "Payouts"}
              {location === "/consignor/settings" && "Settings"}
            </h1>
            <div className="flex items-center">
              <div className="mr-4 relative">
                <Bell className="h-5 w-5 text-neutral-600" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-secondary rounded-full"></span>
              </div>
              <div className="mr-4">
                <HelpCircle className="h-5 w-5 text-neutral-600" />
              </div>
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