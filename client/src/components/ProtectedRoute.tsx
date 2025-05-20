import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteProps } from "wouter";

interface ProtectedRouteProps extends RouteProps {
  path: string;
  requiredUserType?: 'admin' | 'consignor';
  component: React.ComponentType;
}

export function ProtectedRoute({
  path,
  requiredUserType,
  component: Component,
  ...rest
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // Display a loading indicator while checking authentication status
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // If not authenticated, redirect to auth page
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // If a specific user type is required, check for that
  if (requiredUserType && user.userType !== requiredUserType) {
    // For admin routes, redirect consignors to their dashboard
    if (requiredUserType === 'admin' && user.userType === 'consignor') {
      return (
        <Route path={path}>
          <Redirect to="/consignor/dashboard" />
        </Route>
      );
    }
    
    // For consignor routes, redirect admins to their dashboard
    if (requiredUserType === 'consignor' && user.userType === 'admin') {
      return (
        <Route path={path}>
          <Redirect to="/admin/dashboard" />
        </Route>
      );
    }
    
    // Fallback to auth page if user type doesn't match
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // If authenticated and user type matches or is not required, render the component
  return (
    <Route path={path} {...rest}>
      <Component />
    </Route>
  );
}