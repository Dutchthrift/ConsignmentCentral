import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from '@shared/schema';
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Define the types for the authenticated user
export type AuthUser = (User & { 
  customer?: any; 
  userType?: 'admin' | 'consignor';
}) | null;

// Input type for login
type LoginCredentials = {
  email: string;
  password: string;
};

// Input type for registration
type RegisterCredentials = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

// Authentication context type
type AuthContextType = {
  user: AuthUser;
  isLoading: boolean;
  error: Error | null;
  adminLoginMutation: UseMutationResult<AuthUser, Error, LoginCredentials>;
  consignorLoginMutation: UseMutationResult<AuthUser, Error, LoginCredentials>;
  registerMutation: UseMutationResult<AuthUser, Error, RegisterCredentials>;
  logoutMutation: UseMutationResult<void, Error, void>;
};

// Create the authentication context
export const AuthContext = createContext<AuthContextType | null>(null);

// AuthProvider component to wrap the application
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Fetch the current user from the session
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<AuthUser, Error>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Admin login mutation
  const adminLoginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await apiRequest("POST", "/api/auth/admin/login", credentials);
      return await res.json();
    },
    onSuccess: (data: AuthUser) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      toast({
        title: "Login successful",
        description: "You are now logged in as an admin",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Consignor login mutation
  const consignorLoginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await apiRequest("POST", "/api/auth/consignor/login", credentials);
      return await res.json();
    },
    onSuccess: (data: AuthUser) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      toast({
        title: "Login successful",
        description: "You are now logged in as a consignor",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      const res = await apiRequest("POST", "/api/auth/consignor/register", credentials);
      return await res.json();
    },
    onSuccess: (data: AuthUser) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      toast({
        title: "Registration successful",
        description: "Your account has been created and you are now logged in",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        adminLoginMutation,
        consignorLoginMutation,
        registerMutation,
        logoutMutation
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the authentication context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}