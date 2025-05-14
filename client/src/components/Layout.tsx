import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { Separator } from "@/components/ui/separator";
// Import logo
import logoPath from "../assets/logo.png";

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
  Bell
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
  { icon: <Settings className="mr-2 h-5 w-5" />, label: "Settings", path: "/settings" },
];

type LayoutProps = {
  children: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
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
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white text-sm font-medium">JD</span>
            </div>
            <div className="ml-2">
              <p className="text-sm font-medium">John Doe</p>
              <p className="text-xs text-neutral-400">Administrator</p>
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
          <h1 className="text-lg font-medium">Consignment Portal</h1>
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
                <svg
                  className="mr-2 h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 3L21 7L17 11" />
                  <path d="M3 13L7 17L3 21" />
                  <path d="M21 7H7" />
                  <path d="M17 17H3" />
                </svg>
                <h1 className="text-xl font-medium">Consignment Portal</h1>
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
              {location.includes("/dashboard/") && "Customer Dashboard"}
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
