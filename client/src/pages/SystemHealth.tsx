import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function SystemHealth() {
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [healthStatus, setHealthStatus] = useState<{ 
    success: boolean;
    message: string;
    timestamp: string;
    sessionExists: boolean;
    sessionID: string;
    authenticated: boolean;
  } | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [apiCounter, setApiCounter] = useState(0);
  const [connectionErrors, setConnectionErrors] = useState(0);

  // Function to check API health
  const checkApiHealth = async () => {
    try {
      setIsCheckingHealth(true);
      const response = await fetch(`/api/auth/health?counter=${apiCounter}`);
      const data = await response.json();
      setHealthStatus(data);
      setApiCounter(prev => prev + 1);
      
      toast({
        title: "Health check successful",
        description: `API is ${data.success ? 'healthy' : 'unhealthy'}`,
        variant: data.success ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Health check failed:", error);
      setConnectionErrors(prev => prev + 1);
      
      toast({
        title: "Health check failed",
        description: "Could not connect to the API",
        variant: "destructive",
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Ping the health endpoint every 10 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      checkApiHealth();
    }, 10000);
    
    // Run initial check
    checkApiHealth();
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">System Health Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>API Health Status</CardTitle>
            <CardDescription>Current status of the backend API</CardDescription>
          </CardHeader>
          <CardContent>
            {healthStatus ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <Badge variant={healthStatus.success ? "default" : "destructive"}>
                    {healthStatus.success ? "Healthy" : "Unhealthy"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Session ID:</span>
                  <code className="bg-muted text-sm p-1 rounded">{healthStatus.sessionID || "None"}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span>Session Exists:</span>
                  <Badge variant={healthStatus.sessionExists ? "default" : "outline"}>
                    {healthStatus.sessionExists ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Authenticated:</span>
                  <Badge variant={healthStatus.authenticated ? "default" : "outline"}>
                    {healthStatus.authenticated ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last Checked:</span>
                  <span className="text-sm text-muted-foreground">{healthStatus.timestamp}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40">
                <p>Checking API health...</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={checkApiHealth} 
              disabled={isCheckingHealth}
              className="w-full"
            >
              {isCheckingHealth ? "Checking..." : "Check Health Now"}
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>Current user authentication status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <p>Loading auth status...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <Badge variant={user ? "default" : "secondary"}>
                    {user ? "Authenticated" : "Not Authenticated"}
                  </Badge>
                </div>
                {user && (
                  <>
                    <div className="flex items-center justify-between">
                      <span>User ID:</span>
                      <code className="bg-muted text-sm p-1 rounded">{user.id}</code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Email:</span>
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Role:</span>
                      <Badge>{user.role}</Badge>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between">
                  <span>API calls made:</span>
                  <Badge variant="outline">{apiCounter}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Connection errors:</span>
                  <Badge variant={connectionErrors > 0 ? "destructive" : "outline"}>
                    {connectionErrors}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/auth'}
            >
              Go to Login
            </Button>
            {user && (
              <Button 
                variant="destructive" 
                onClick={async () => {
                  try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                    window.location.reload();
                  } catch (error) {
                    console.error("Logout failed:", error);
                  }
                }}
              >
                Logout
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
