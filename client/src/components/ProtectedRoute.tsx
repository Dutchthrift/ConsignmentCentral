import { Route, Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";

type ProtectedRouteProps = {
  path: string;
  component: React.ComponentType<any>;
  allowedRoles?: string[];
  redirectTo?: string;
};

export function ProtectedRoute({ 
  path, 
  component: Component, 
  allowedRoles = [],
  redirectTo = "/auth"
}: ProtectedRouteProps) {
  const { user, isLoading, error } = useAuth();

  // Handle loading state
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
        </div>
      </Route>
    );
  }

  // Handle error state (added error handling)
  if (error) {
    console.error("Auth error in ProtectedRoute:", error);
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="text-destructive mb-4">Authentication Error</div>
          <p className="text-sm text-muted-foreground mb-4">There was a problem checking your authentication status.</p>
          <button 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            onClick={() => window.location.href = "/auth"}
          >
            Go to Login
          </button>
        </div>
      </Route>
    );
  }

  // If no user, redirect to the specified redirect path (defaults to /auth)
  if (!user) {
    console.log(`No user found, redirecting to ${redirectTo}`);
    return (
      <Route path={path}>
        <Redirect to={redirectTo} />
      </Route>
    );
  }

  // If roles are specified, check if user has the required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect admins to admin dashboard and consignors to consignor dashboard
    const redirectPath = user.role === UserRole.ADMIN ? "/" : "/consignor/dashboard";
    
    return (
      <Route path={path}>
        <Redirect to={redirectPath} />
      </Route>
    );
  }

  // User is authenticated and has the required role, render the component
  return <Route path={path} component={Component} />;
}