import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import IntakeForm from "@/pages/IntakeForm";
import Inventory from "@/pages/Inventory";
import Orders from "@/pages/Orders";
import Payouts from "@/pages/Payouts";
import Settings from "@/pages/Settings";
import Storefront from "@/pages/Storefront";
import ModelTraining from "@/pages/ModelTraining";
import Consignors from "@/pages/Consignors";
import Login from "@/pages/Login";
import ConsignorLogin from "@/pages/ConsignorLogin";
import ConsignorDashboard from "@/pages/ConsignorDashboard";
import Layout from "@/components/Layout";
import StorefrontLayout from "@/components/StorefrontLayout";
import ConsignorLayout from "@/components/ConsignorLayout";

function Router() {
  const [location] = useLocation();
  
  // Check path types
  const isLoginPath = location === "/login";
  const isConsignorLoginPath = location === "/consignor/login";
  const isStorefrontPath = location.startsWith("/storefront");
  const isConsignorPath = location.startsWith("/consignor") && !isConsignorLoginPath;
  
  // If we're on a login page, don't use any layout
  if (isLoginPath || isConsignorLoginPath) {
    return (
      <>
        <Toaster />
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/consignor/login" component={ConsignorLogin} />
        </Switch>
      </>
    );
  }
  
  // Use different layouts based on path
  let AppLayout = Layout; // Default admin layout
  
  if (isStorefrontPath) {
    AppLayout = StorefrontLayout;
  } else if (isConsignorPath) {
    AppLayout = ConsignorLayout;
  }
  
  return (
    <AppLayout>
      <Toaster />
      <Switch>
        {/* Admin Dashboard Routes */}
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/intake" component={IntakeForm} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/orders" component={Orders} />
        <Route path="/payouts" component={Payouts} />
        <Route path="/settings" component={Settings} />
        <Route path="/model-training" component={ModelTraining} />
        <Route path="/consignors" component={Consignors} />
        <Route path="/dashboard/:customerId" component={Dashboard} />
        
        {/* Consignor Dashboard Routes */}
        <Route path="/consignor/dashboard" component={ConsignorDashboard} />
        <Route path="/consignor/submit" component={() => <div>Submit New Item</div>} />
        <Route path="/consignor/items" component={() => <div>My Items</div>} />
        <Route path="/consignor/payouts" component={() => <div>My Payouts</div>} />
        <Route path="/consignor/settings" component={() => <div>Account Settings</div>} />
        
        {/* Customer Storefront Routes */}
        <Route path="/storefront" component={Storefront} />
        
        {/* 404 Page */}
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
