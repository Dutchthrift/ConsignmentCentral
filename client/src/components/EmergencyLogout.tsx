import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

/**
 * A fail-safe logout button that uses direct DOM methods
 * to clear authentication state and force redirect to the login page.
 */
export function EmergencyLogout() {
  const executeLogout = () => {
    // Create and append a simple form that posts to the logout endpoint
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/auth/logout';
    form.style.display = 'none';
    
    // Add a timestamp to prevent caching
    const timestampField = document.createElement('input');
    timestampField.type = 'hidden';
    timestampField.name = 'timestamp';
    timestampField.value = Date.now().toString();
    form.appendChild(timestampField);
    
    // Append form to the document
    document.body.appendChild(form);
    
    // Submit the form, which will trigger a post request
    form.submit();
    
    // Set a timeout to redirect to login page in case the form submission doesn't trigger a redirect
    setTimeout(() => {
      window.location.href = '/auth';
    }, 500);
  };

  return (
    <Button 
      variant="destructive" 
      className="w-full sm:w-auto flex items-center"
      onClick={executeLogout}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Emergency Logout
    </Button>
  );
}