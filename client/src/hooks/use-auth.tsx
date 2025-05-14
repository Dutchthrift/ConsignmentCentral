import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, UserRole } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient, setAuthToken } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAdmin: boolean;
  isConsignor: boolean;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  name: string;
  email: string;
  password: string;
  role: string;
  provider?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<User | null>({ on401: "returnNull" }),
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Determine user roles
  const isAdmin = user?.role === UserRole.ADMIN;
  const isConsignor = user?.role === UserRole.CONSIGNOR;

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      // Rename username to email for the server
      const loginData = {
        email: credentials.username, 
        password: credentials.password
      };
      
      const res = await apiRequest("POST", "/api/auth/login", loginData);
      console.log("Login response status:", res.status);
      
      if (!res.ok) {
        let errorMessage = "Invalid credentials";
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        throw new Error(errorMessage);
      }
      
      try {
        const responseData = await res.json();
        console.log("Login response data:", responseData);
        
        // Handle both direct user object and wrapped data formats
        if (responseData.success && responseData.data) {
          return responseData.data;
        }
        
        return responseData;
      } catch (e) {
        console.error("Error parsing success response:", e);
        throw new Error("Could not parse server response");
      }
    },
    onSuccess: (userData: User & { token?: string }) => {
      console.log("Login successful, received user data:", userData);
      
      // Store the token if it was returned
      if (userData.token) {
        console.log("Token received in login response, saving it");
        setAuthToken(userData.token);
        
        // Remove token from user data before storing in cache
        const { token, ...userWithoutToken } = userData;
        queryClient.setQueryData(["/api/auth/user"], userWithoutToken);
      } else {
        console.log("No token received in login response");
        queryClient.setQueryData(["/api/auth/user"], userData);
      }
      
      // Navigate based on user role - use setTimeout to ensure state is updated first
      setTimeout(() => {
        if (userData.role === UserRole.ADMIN) {
          console.log("Redirecting to admin dashboard");
          navigate("/");
        } else if (userData.role === UserRole.CONSIGNOR) {
          console.log("Redirecting to consignor dashboard");
          navigate("/consignor/dashboard");
        } else {
          console.log("Unknown role:", userData.role);
        }
      }, 100);
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.name || "user"}!`,
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
    mutationFn: async (data: RegisterData) => {
      // Ensure field names match server expectations
      const registerData = {
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role,
        provider: data.provider || 'local'
      };
      
      const res = await apiRequest("POST", "/api/auth/register", registerData);
      console.log("Register response status:", res.status);
      
      if (!res.ok) {
        let errorMessage = "Registration failed";
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        throw new Error(errorMessage);
      }
      
      try {
        const responseData = await res.json();
        console.log("Registration response data:", responseData);
        
        // Handle both direct user object and wrapped data formats
        if (responseData.success && responseData.data) {
          return responseData.data;
        }
        
        return responseData;
      } catch (e) {
        console.error("Error parsing success response:", e);
        throw new Error("Could not parse server response");
      }
    },
    onSuccess: (userData: User) => {
      console.log("Registration successful, received user data:", userData);
      queryClient.setQueryData(["/api/auth/user"], userData);
      
      // Navigate based on user role - use setTimeout to ensure state is updated first
      setTimeout(() => {
        if (userData.role === UserRole.ADMIN) {
          console.log("Redirecting to admin dashboard");
          navigate("/");
        } else if (userData.role === UserRole.CONSIGNOR) {
          console.log("Redirecting to consignor dashboard");
          navigate("/consignor/dashboard");
        } else {
          console.log("Unknown role:", userData.role);
        }
      }, 100);
      
      toast({
        title: "Registration successful",
        description: `Welcome, ${userData.name || "user"}!`,
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
      const res = await apiRequest("POST", "/api/auth/logout");
      if (!res.ok) {
        throw new Error("Logout failed");
      }
    },
    onSuccess: () => {
      // Clear the stored token
      setAuthToken(null);
      
      queryClient.setQueryData(["/api/auth/user"], null);
      navigate("/auth");
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

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        isAdmin,
        isConsignor,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}