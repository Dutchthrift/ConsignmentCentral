import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AdminLoginPage = () => {
  const { user, adminLoginMutation, adminRegisterMutation } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: ""
  });

  const [, navigate] = useLocation();
  
  // If user is already logged in, redirect to appropriate dashboard
  if (user) {
    navigate("/admin/dashboard");
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "login") {
      adminLoginMutation.mutate({
        username: formData.email,
        password: formData.password
      });
    } else {
      adminRegisterMutation.mutate({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: "admin"
      });
    }
  };

  const toggleMode = () => {
    setMode(prev => (prev === "login" ? "register" : "login"));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {mode === "login" ? "Admin Login" : "Create Admin Account"}
          </CardTitle>
          <CardDescription className="text-center">
            {mode === "login"
              ? "Enter your credentials to access the admin panel"
              : "Create a new admin account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            {(adminLoginMutation.error || adminRegisterMutation.error) && (
              <Alert variant="destructive">
                <AlertDescription>
                  {adminLoginMutation.error?.message || adminRegisterMutation.error?.message}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={adminLoginMutation.isPending || adminRegisterMutation.isPending}
            >
              {adminLoginMutation.isPending || adminRegisterMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Login" : "Register"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" onClick={toggleMode}>
            {mode === "login"
              ? "Need to create an admin account? Register here"
              : "Already have an admin account? Login here"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AdminLoginPage;