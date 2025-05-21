import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
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
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import OrderDetail from "@/pages/OrderDetail";
import ConsignorDashboard from "@/pages/ConsignorDashboard";
import Items from "@/pages/Items";
import ConsignorHistory from "@/pages/ConsignorHistory";
import ConsignorPayouts from "@/pages/ConsignorPayouts";
import ConsignorProfile from "@/pages/ConsignorProfile";
import ConsignorSettings from "@/pages/ConsignorSettings";
import ConsignorInsights from "@/pages/ConsignorInsights";
import ConsignorSubmitItem from "@/pages/ConsignorSubmitItem";
import Layout from "@/components/Layout";
import StorefrontLayout from "@/components/StorefrontLayout";
import ConsignorLayout from "@/components/ConsignorLayout";
import ConsignorItemDetail from "@/pages/ConsignorItemDetail";
import NewItemIntakePage from "@/pages/NewItemIntakePage";
import TokenTestPage from "@/pages/token-test-page";
import SupabaseIntakePage from "@/pages/SupabaseIntakePage";
import AuthPage from "@/pages/auth-page";
// No layout for login pages - they have their own interface

function Router() {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();
  
  // Check path types
  const isLoginPath = location === "/login" || location === "/auth";
  const isRootPath = location === "/";
  const isStorefrontPath = location.startsWith("/storefront");
  const isSetupPath = location.startsWith("/setup-account") || location.startsWith("/setup-complete");
  const isConsignorPath = location.startsWith("/consignor") && location !== "/consignor/login";
  const isAdminPath = location === "/consignors" || location.startsWith("/admin");

  // Redirect from root to appropriate path
  if (isRootPath) {
    if (!isLoading) {
      if (user) {
        // If logged in, redirect based on role
        if (user.role === 'admin') {
          return <Redirect to="/admin" />;
        } else {
          return <Redirect to="/consignor/dashboard" />;
        }
      } else {
        // Not logged in, redirect to login page
        return <Redirect to="/login" />;
      }
    } else {
      // Show loading state while authentication state is being loaded
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
  }

  // If we're on the login page, don't use the standard layout
  if (isLoginPath) {
    // If already logged in, redirect to appropriate dashboard
    if (user && !isLoading) {
      if (user.role === 'admin') {
        return <Redirect to="/admin" />;
      } else {
        return <Redirect to="/consignor/dashboard" />;
      }
    }
    
    return (
      <>
        <Toaster />
        <Switch>
          <Route path="/login" component={AuthPage} />
          <Route path="/auth" component={AuthPage} />
        </Switch>
      </>
    );
  }
  
  // Use different layouts based on path
  let AppLayout = Layout; // Default admin layout
  
  if (isStorefrontPath || isSetupPath) {
    AppLayout = StorefrontLayout;
  } else if (isConsignorPath) {
    AppLayout = ConsignorLayout;
  } else if (isAdminPath) {
    AppLayout = Layout; // Ensure admin routes use admin layout explicitly
  }
  
  return (
    <AppLayout>
      <Toaster />
      <Switch>
        {/* Admin Dashboard Routes */}
        <ProtectedRoute 
          path="/admin" 
          component={AdminDashboardPage}
          adminOnly
        />
        <ProtectedRoute 
          path="/admin/dashboard" 
          component={AdminDashboardPage}
          adminOnly
        />
        <ProtectedRoute 
          path="/intake" 
          component={IntakeForm}
          adminOnly
        />
        <ProtectedRoute 
          path="/inventory" 
          component={Items}
          adminOnly
        />
        <ProtectedRoute 
          path="/orders" 
          component={Orders}
          adminOnly
        />
        <ProtectedRoute 
          path="/orders/:id" 
          component={OrderDetail}
          adminOnly
        />
        <ProtectedRoute 
          path="/payouts" 
          component={Payouts}
          adminOnly
        />
        <ProtectedRoute 
          path="/settings" 
          component={Settings}
          adminOnly
        />
        <ProtectedRoute 
          path="/model-training" 
          component={ModelTraining}
          adminOnly
        />
        <ProtectedRoute 
          path="/admin/consignors" 
          component={Consignors}
          adminOnly
        />
        
        {/* Keep old route for backward compatibility, but redirect to new one */}
        <ProtectedRoute 
          path="/consignors" 
          component={() => {
            const [, navigate] = useLocation();
            React.useEffect(() => {
              navigate("/admin/consignors");
            }, [navigate]);
            return null;
          }}
          adminOnly
        />
        <ProtectedRoute 
          path="/dashboard/:customerId" 
          component={Dashboard}
          adminOnly
        />
        
        {/* Consignor Dashboard Routes */}
        <ProtectedRoute 
          path="/consignor" 
          component={ConsignorDashboard}
        />
        <ProtectedRoute 
          path="/consignor/dashboard" 
          component={ConsignorDashboard}
        />
        <ProtectedRoute
          path="/consignor/new-item" 
          component={NewItemIntakePage}
        />
        <ProtectedRoute
          path="/consignor/supabase-intake" 
          component={SupabaseIntakePage}
        />
        <ProtectedRoute 
          path="/consignor/items" 
          component={Items}
        />
        <ProtectedRoute 
          path="/consignor/items/:id" 
          component={ConsignorItemDetail}
        />
        <ProtectedRoute 
          path="/consignor/history" 
          component={ConsignorHistory}
        />
        <ProtectedRoute 
          path="/consignor/orders" 
          component={Orders}
        />
        <ProtectedRoute 
          path="/consignor/orders/:id" 
          component={OrderDetail}
        />
        <ProtectedRoute 
          path="/consignor/payouts" 
          component={ConsignorPayouts}
        />
        <ProtectedRoute 
          path="/consignor/insights" 
          component={ConsignorInsights}
        />
        <ProtectedRoute 
          path="/consignor/profile" 
          component={ConsignorProfile}
        />
        <ProtectedRoute 
          path="/consignor/settings" 
          component={ConsignorSettings}
        />
        
        {/* Customer Storefront Routes */}
        <Route path="/storefront" component={Storefront} />
        <Route path="/storefront/submit-item" component={NewItemIntakePage} />
        
        {/* Consignor Registration Flow - public routes */}
        <Route path="/setup-account" component={SetupAccount} />
        <Route path="/setup-complete" component={SetupComplete} />
        
        {/* System Health Check - publicly accessible */}
        <Route path="/system-health" component={SystemHealth} />
        
        {/* Token Test Page - for debugging */}
        <Route path="/token-test" component={TokenTestPage} />
        
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
