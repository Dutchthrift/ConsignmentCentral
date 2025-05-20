import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types for our auth data
type AuthContextType = {
  user: UserData | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<LoginResponse, Error, LoginData>;
  logoutMutation: UseMutationResult<LogoutResponse, Error, void>;
  registerMutation: UseMutationResult<RegisterResponse, Error, RegisterData>;
};

// User data returned from the API
interface UserData {
  id: number;
  email: string;
  name: string;
  role: string;
  customer?: any; // Customer data for consignors
}

// Login request data
interface LoginData {
  email: string;
  password: string;
  userType: "admin" | "consignor"; // Used to determine which login endpoint to use
}

// Login response from API
interface LoginResponse {
  success: boolean;
  data: {
    user: UserData;
    token: string;
    customer?: any;
  };
}

// Register request data
interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

// Register response from API
interface RegisterResponse {
  success: boolean;
  data: {
    user: UserData;
    token: string;
    customer: any;
  };
}

// Logout response
interface LogoutResponse {
  success: boolean;
  message: string;
}

// Create the auth context
export const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider component to wrap the app
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Query to get the current user data - used for initial load and after login/register
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<UserData | null, Error>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Login mutation
  const loginMutation = useMutation<LoginResponse, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      const { userType, ...data } = credentials;
      const endpoint = userType === "admin" 
        ? "/api/auth/admin/login" 
        : "/api/auth/consignor/login";
      
      const res = await apiRequest("POST", endpoint, data);
      return await res.json();
    },
    onSuccess: (response: LoginResponse) => {
      // Store token in localStorage for later use
      if (response.data.token) {
        localStorage.setItem("authToken", response.data.token);
      }
      
      // Update the user data in the cache
      queryClient.setQueryData(["/api/auth/me"], response.data.user);
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${response.data.user.name}!`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation<RegisterResponse, Error, RegisterData>({
    mutationFn: async (userData: RegisterData) => {
      const res = await apiRequest("POST", "/api/auth/register", userData);
      return await res.json();
    },
    onSuccess: (response: RegisterResponse) => {
      // Store token in localStorage for later use
      if (response.data.token) {
        localStorage.setItem("authToken", response.data.token);
      }
      
      // Update the user data in the cache
      queryClient.setQueryData(["/api/auth/me"], response.data.user);
      
      toast({
        title: "Registration successful",
        description: `Welcome, ${response.data.user.name}!`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation<LogoutResponse, Error, void>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/logout");
      return await res.json();
    },
    onSuccess: () => {
      // Remove token from localStorage
      localStorage.removeItem("authToken");
      
      // Clear user data from cache
      queryClient.setQueryData(["/api/auth/me"], null);
      
      // Invalidate all queries to refresh the app state
      queryClient.invalidateQueries();
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
        variant: "default",
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
        user,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}