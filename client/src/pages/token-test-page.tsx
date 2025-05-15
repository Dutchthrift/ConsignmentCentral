import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "../lib/queryClient";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function TokenTestPage() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get token from localStorage
  const populateFromStorage = () => {
    const storedToken = localStorage.getItem("auth_token");
    if (storedToken) {
      setToken(storedToken);
    } else {
      setError("No token found in localStorage");
    }
  };

  // Verify token
  const verifyToken = async () => {
    if (!token) {
      setError("Please enter a token first");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiRequest("POST", "/api/admin-auth-test/verify-token", { token });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Admin Token Verification Test</CardTitle>
          <CardDescription>
            Use this tool to test if an admin authentication token is valid
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Enter JWT token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="flex-1"
            />
            <Button onClick={populateFromStorage}>Get from Storage</Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              <h3 className="font-semibold mb-2">Result:</h3>
              <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={verifyToken} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
              </>
            ) : (
              "Verify Token"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}