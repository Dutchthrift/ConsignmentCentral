import React from 'react';
import { Route, Redirect, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
  adminOnly?: boolean;
}

export function ProtectedRoute({ path, component: Component, adminOnly = false }: ProtectedRouteProps) {
  const { user, isLoading, isAdmin } = useAuth();
  const [, navigate] = useLocation();

  // If still loading auth state, show loading indicator
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/login" />
      </Route>
    );
  }

  // Admin-only route, but user is not an admin
  if (adminOnly && !isAdmin()) {
    return (
      <Route path={path}>
        <Redirect to="/consignor/dashboard" />
      </Route>
    );
  }

  // User is authenticated and has correct role - render component
  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}