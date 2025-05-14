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
import Login from "@/pages/Login";
import Layout from "@/components/Layout";
import StorefrontLayout from "@/components/StorefrontLayout";

function Router() {
  const [location] = useLocation();
  
  // Check if the current path is a login path
  const isLoginPath = location === "/login";
  
  // Check if the current path is a storefront path
  const isStorefrontPath = location.startsWith("/storefront");
  
  // If we're on the login page, don't use any layout
  if (isLoginPath) {
    return (
      <>
        <Toaster />
        <Switch>
          <Route path="/login" component={Login} />
        </Switch>
      </>
    );
  }
  
  // Use different layouts based on path
  const AppLayout = isStorefrontPath ? StorefrontLayout : Layout;
  
  return (
    <AppLayout>
      <Toaster />
      <Switch>
        {/* Admin Dashboard Routes */}
        <Route path="/" component={Dashboard} />
        <Route path="/intake" component={IntakeForm} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/orders" component={Orders} />
        <Route path="/payouts" component={Payouts} />
        <Route path="/settings" component={Settings} />
        <Route path="/model-training" component={ModelTraining} />
        <Route path="/dashboard/:customerId" component={Dashboard} />
        
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
