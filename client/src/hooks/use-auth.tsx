import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "../lib/queryClient";

// Types for user data
interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

// Admin user type
interface AdminUser extends User {
  role: 'admin';
}

// Consignor user type
interface ConsignorUser extends User {
  role: 'consignor';
  customer: {
    id: number;
    email: string;
    name: string; // Single name field to match database structure
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
  };
}

// Login credentials
interface LoginCredentials {
  email: string;
  password: string;
}

// Registration data
interface RegisterData extends LoginCredentials {
  name: string; // Single name field to match database structure
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

// Auth context type
interface AuthContextType {
  user: AdminUser | ConsignorUser | null;
  isLoading: boolean;
  error: Error | null;
  isAdmin: () => boolean;
  isConsignor: () => boolean;
  loginAdmin: UseMutationResult<AdminUser, Error, LoginCredentials>;
  loginConsignor: UseMutationResult<ConsignorUser, Error, LoginCredentials>;
  register: UseMutationResult<ConsignorUser, Error, RegisterData>;
  logout: UseMutationResult<void, Error, void>;
}

// Create auth context
const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Fetch current user data
  const {
    data: userData,
    error,
    isLoading,
  } = useQuery<AdminUser | ConsignorUser | null, Error>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/auth/me");
        if (!res.ok) {
          if (res.status === 401) {
            return null;
          }
          throw new Error("Failed to fetch user data");
        }
        return await res.json();
      } catch (error) {
        if (error instanceof Error && error.message.includes("401")) {
          return null;
        }
        throw error;
      }
    },
  });
  
  // Make sure user is never undefined
  const user = userData || null;

  // Helper functions to check user role
  const isAdmin = () => user?.role === "admin";
  const isConsignor = () => user?.role === "consignor";

  // Admin login mutation
  const loginAdmin = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      try {
        // Use the fixed direct login endpoint
        const res = await apiRequest("POST", "/api/auth/admin/login-direct", credentials);
        if (!res.ok) {
          // Check if the response is HTML (common error with express)
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            throw new Error("Server error. Please try again.");
          }
          // Otherwise try to parse as JSON
          const errorData = await res.json();
          throw new Error(errorData.message || "Login failed");
        }
        const data = await res.json();
        return data.data.user;
      } catch (error: any) {
        // Handle JSON parse errors
        if (error.name === 'SyntaxError') {
          throw new Error("Server returned invalid data. Please try again.");
        }
        throw error;
      }
    },
    onSuccess: (userData: AdminUser) => {
      queryClient.setQueryData(["/api/auth/me"], userData);
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.name}!`,
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
  const loginConsignor = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await apiRequest("POST", "/api/auth/consignor/login", credentials);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Login failed");
      }
      const data = await res.json();
      return data.data.user;
    },
    onSuccess: (userData: ConsignorUser) => {
      queryClient.setQueryData(["/api/auth/me"], userData);
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.name}!`,
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
  const register = useMutation({
    mutationFn: async (registerData: RegisterData) => {
      const res = await apiRequest("POST", "/api/auth/register", registerData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Registration failed");
      }
      const data = await res.json();
      return data.data.user;
    },
    onSuccess: (userData: ConsignorUser) => {
      queryClient.setQueryData(["/api/auth/me"], userData);
      toast({
        title: "Registration successful",
        description: `Welcome, ${userData.name}!`,
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
  const logout = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/logout");
      if (!res.ok) {
        throw new Error("Logout failed");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
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

  // Auth context value
  const authContextValue: AuthContextType = {
    user: user as AdminUser | ConsignorUser | null,
    isLoading,
    error,
    isAdmin,
    isConsignor,
    loginAdmin,
    loginConsignor,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Auth hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}