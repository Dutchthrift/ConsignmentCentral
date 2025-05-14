import { useCallback, useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SiGoogle, SiApple } from "react-icons/si";
import { Logo } from "@/components/Logo";

const Login = () => {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/login");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if redirected with error
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const errorParam = queryParams.get("error");
    
    if (errorParam) {
      switch (errorParam) {
        case "google-auth-failed":
          setError("Google authentication failed. Please try again.");
          break;
        case "apple-auth-failed":
          setError("Apple authentication failed. Please try again.");
          break;
        default:
          setError("Authentication failed. Please try again.");
      }
      
      toast({
        title: "Authentication Error",
        description: error || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast, error]);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/auth/status");
        const data = await response.json();
        
        if (data.authenticated) {
          // User is already logged in, redirect to dashboard
          setLocation("/dashboard");
        }
      } catch (err) {
        console.error("Failed to check authentication status:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, [setLocation]);

  const handleGoogleLogin = useCallback(() => {
    window.location.href = "/api/auth/google";
  }, []);

  const handleAppleLogin = useCallback(() => {
    window.location.href = "/api/auth/apple";
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center space-y-2">
          <Logo className="h-20 w-20" />
          <h1 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            Dutch Thrift
          </h1>
          <h2 className="text-center text-xl font-medium text-gray-600">
            Sign in to your account
          </h2>
        </div>

        <Card className="p-6 shadow-xl">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Button 
              className="w-full flex items-center justify-center gap-2"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <SiGoogle className="h-4 w-4" />
              <span>Continue with Google</span>
            </Button>
            
            <Button 
              className="w-full flex items-center justify-center gap-2"
              variant="outline"
              onClick={handleAppleLogin}
              disabled={isLoading}
            >
              <SiApple className="h-4 w-4" />
              <span>Continue with Apple</span>
            </Button>
          </div>
          
          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              By signing in, you agree to our <a href="#" className="font-medium text-blue-600 hover:text-blue-500">Terms of Service</a> and <a href="#" className="font-medium text-blue-600 hover:text-blue-500">Privacy Policy</a>.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;