import { useState } from "react";
import { Button } from "./ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function LogoutButton() {
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    
    try {
      // Show logout toast
      toast({
        title: "Logging out...",
        description: "Please wait while we securely log you out."
      });
      
      // 1. Clear all client-side storage
      localStorage.clear();
      sessionStorage.clear();
      
      // 2. Clear all cookies - different variations for maximum compatibility
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        
        // Try multiple path and domain combinations to ensure cookies are cleared
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
      
      // 3. Clear JWT token
      localStorage.removeItem('dutchthrift_auth_token');
      localStorage.removeItem('authToken');
      
      // 4. Attempt server logout directly using fetch
      try {
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        console.log('Server logout response:', response.status);
      } catch (error) {
        console.log('Server logout request failed, continuing anyway');
      }
      
      // 5. Always redirect to login regardless of server response
      // Add timestamp to prevent caching and ensure a fresh page load
      window.location.href = '/auth?t=' + Date.now();
      
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if there's an error, try to force redirect
      window.location.href = '/auth';
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      className="w-full sm:w-auto flex items-center"
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
      <LogOut className="mr-2 h-4 w-4" />
      {isLoggingOut ? "Logging out..." : "Logout"}
    </Button>
  );
}