import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UserRole } from "@shared/schema";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import IntakeForm from "@/pages/IntakeForm";
import SystemHealth from "@/pages/SystemHealth";
import Inventory from "@/pages/Inventory";
import Orders from "@/pages/Orders";
import Payouts from "@/pages/Payouts";
import Settings from "@/pages/Settings";
import Storefront from "@/pages/Storefront";
import SetupAccount from "@/pages/SetupAccount";
import SetupComplete from "@/pages/SetupComplete";
import ModelTraining from "@/pages/ModelTraining";
import Consignors from "@/pages/Consignors";
import Login from "@/pages/Login";
import ConsignorLogin from "@/pages/ConsignorLogin";
import ConsignorDashboard from "@/pages/ConsignorDashboard";
import ConsignorItems from "@/pages/ConsignorItems";
import ConsignorHistory from "@/pages/ConsignorHistory";
import ConsignorPayouts from "@/pages/ConsignorPayouts";
import ConsignorProfile from "@/pages/ConsignorProfile";
import ConsignorSettings from "@/pages/ConsignorSettings";
import ConsignorInsights from "@/pages/ConsignorInsights";
import Layout from "@/components/Layout";
import StorefrontLayout from "@/components/StorefrontLayout";
import ConsignorLayout from "@/components/ConsignorLayout";
// No layout for login pages - they have their own interface

function Router() {
  const [location] = useLocation();
  
  // Check path types
  const isLoginPath = location === "/login" || location === "/auth";
  const isConsignorLoginPath = location === "/consignor/login";
  const isStorefrontPath = location.startsWith("/storefront");
  const isConsignorPath = location.startsWith("/consignor") && !isConsignorLoginPath;
  
  // If we're on a login page, don't use the standard layout
  if (isLoginPath || isConsignorLoginPath) {
    return (
      <>
        <Toaster />
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/auth" component={ConsignorLogin} />
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
        <ProtectedRoute 
          path="/" 
          component={Dashboard} 
          allowedRoles={[UserRole.ADMIN]} 
        />
        <ProtectedRoute 
          path="/dashboard" 
          component={Dashboard}
          allowedRoles={[UserRole.ADMIN]} 
        />
        <ProtectedRoute 
          path="/intake" 
          component={IntakeForm}
          allowedRoles={[UserRole.ADMIN]} 
        />
        <ProtectedRoute 
          path="/inventory" 
          component={Inventory}
          allowedRoles={[UserRole.ADMIN]} 
        />
        <ProtectedRoute 
          path="/orders" 
          component={Orders}
          allowedRoles={[UserRole.ADMIN]} 
        />
        <ProtectedRoute 
          path="/payouts" 
          component={Payouts}
          allowedRoles={[UserRole.ADMIN]} 
        />
        <ProtectedRoute 
          path="/settings" 
          component={Settings}
          allowedRoles={[UserRole.ADMIN]} 
        />
        <ProtectedRoute 
          path="/model-training" 
          component={ModelTraining}
          allowedRoles={[UserRole.ADMIN]} 
        />
        <ProtectedRoute 
          path="/consignors" 
          component={Consignors}
          allowedRoles={[UserRole.ADMIN]} 
        />
        <ProtectedRoute 
          path="/dashboard/:customerId" 
          component={Dashboard}
          allowedRoles={[UserRole.ADMIN]} 
        />
        
        {/* Consignor Dashboard Routes */}
        <ProtectedRoute 
          path="/consignor" 
          component={ConsignorDashboard}
          allowedRoles={[UserRole.CONSIGNOR]} 
        />
        <ProtectedRoute 
          path="/consignor/dashboard" 
          component={ConsignorDashboard}
          allowedRoles={[UserRole.CONSIGNOR]} 
        />
        <ProtectedRoute
          path="/consignor/submit" 
          component={() => <div>Submit New Item</div>}
          allowedRoles={[UserRole.CONSIGNOR]} 
        />
        <ProtectedRoute 
          path="/consignor/items" 
          component={ConsignorItems}
          allowedRoles={[UserRole.CONSIGNOR]} 
        />
        <ProtectedRoute 
          path="/consignor/history" 
          component={ConsignorHistory}
          allowedRoles={[UserRole.CONSIGNOR]} 
        />
        <ProtectedRoute 
          path="/consignor/payouts" 
          component={ConsignorPayouts}
          allowedRoles={[UserRole.CONSIGNOR]} 
        />
        <ProtectedRoute 
          path="/consignor/insights" 
          component={ConsignorInsights}
          allowedRoles={[UserRole.CONSIGNOR]} 
        />
        <ProtectedRoute 
          path="/consignor/profile" 
          component={ConsignorProfile}
          allowedRoles={[UserRole.CONSIGNOR]} 
        />
        <ProtectedRoute 
          path="/consignor/settings" 
          component={ConsignorSettings}
          allowedRoles={[UserRole.CONSIGNOR]} 
        />
        
        {/* Authentication Routes */}
        <Route path="/auth" component={ConsignorLogin} />
        <Route path="/consignor/login" component={ConsignorLogin} />
        
        {/* Customer Storefront Routes */}
        <Route path="/storefront" component={Storefront} />
        <Route path="/setup-account" component={SetupAccount} />
        <Route path="/setup-complete" component={SetupComplete} />
        
        {/* System Health Check - publicly accessible */}
        <Route path="/system-health" component={SystemHealth} />
        
        {/* 404 Page */}
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

// ErrorBoundary is already imported at the top

function App() {
  // Set up error tracking
  const handleGlobalError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Global error caught by ErrorBoundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // You could add more sophisticated error tracking here
    // such as sending to a logging service
  };

  return (
    <ErrorBoundary 
      autoReset={true} 
      resetTimeout={8000} 
      resetSoft={true}
      onError={handleGlobalError}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            {/* Wrap individual routes in their own error boundaries */}
            <ErrorBoundary>
              <Router />
            </ErrorBoundary>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
