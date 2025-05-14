import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UserRole } from "@shared/schema";

// Import logo
import logoPath from "../assets/logo.png";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function ConsignorLogin() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("login");
  const [match, params] = useRoute("/consignor/login");
  const { toast } = useToast();
  
  // Get the error from URL query param
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get("error");
  
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });
  
  // Show error toast if there's an error in the URL
  if (error) {
    toast({
      title: "Authentication Error",
      description: error === "google-auth-failed" ? "Google authentication failed" : "Authentication failed",
      variant: "destructive",
    });
  }
  
  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest("POST", "/api/auth/login", {
        username: data.email,
        password: data.password,
      });
      
      if (response.ok) {
        const userData = await response.json();
        
        // Redirect different depending on role
        if (userData.role === UserRole.CONSIGNOR) {
          // Redirect to consignor dashboard
          setLocation("/consignor/dashboard");
        } else {
          // If they're an admin, redirect to admin dashboard
          setLocation("/");
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Invalid credentials");
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const onRegisterSubmit = async (data: RegisterFormValues) => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest("POST", "/api/auth/register", {
        ...data,
        role: UserRole.CONSIGNOR,  // Force consignor role
        provider: "local",
      });
      
      if (response.ok) {
        // Registration successful, now log the user in
        setLocation("/consignor/dashboard");
        toast({
          title: "Registration Successful",
          description: "Your account has been created.",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "An error occurred during registration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Left Side - Form */}
      <div className="flex flex-col w-full items-center justify-center px-6 lg:w-1/2">
        <div className="mx-auto w-full max-w-md space-y-6 py-12">
          <div className="flex flex-col items-center space-y-2 text-center mb-8">
            <img src={logoPath} alt="Dutch Thrift Logo" className="h-20 mb-4" />
            <h1 className="text-2xl font-bold">Consignor Portal</h1>
            <p className="text-neutral-500">Sign in to manage your consigned items</p>
          </div>
          
          <Card className="w-full">
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <CardHeader>
                  <CardTitle>Login to your account</CardTitle>
                  <CardDescription>
                    Enter your email and password to access your dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="your.email@example.com" 
                                type="email"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="••••••••" 
                                type="password"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Logging in..." : "Login"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-neutral-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-2 text-neutral-500">Or continue with</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 w-full">
                    <Button variant="outline">
                      <a href="/api/auth/google" className="flex items-center justify-center w-full">
                        Google
                      </a>
                    </Button>
                    <Button variant="outline">
                      <a href="/api/auth/apple" className="flex items-center justify-center w-full">
                        Apple
                      </a>
                    </Button>
                  </div>
                </CardFooter>
              </TabsContent>
              
              <TabsContent value="register">
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>
                    Register as a new consignor
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="John Doe" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="your.email@example.com" 
                                type="email"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="••••••••" 
                                type="password"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Creating account..." : "Create account"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-neutral-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-2 text-neutral-500">Or continue with</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 w-full">
                    <Button variant="outline">
                      <a href="/api/auth/google" className="flex items-center justify-center w-full">
                        Google
                      </a>
                    </Button>
                    <Button variant="outline">
                      <a href="/api/auth/apple" className="flex items-center justify-center w-full">
                        Apple
                      </a>
                    </Button>
                  </div>
                </CardFooter>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
      
      {/* Right Side - Hero Section (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary-dark text-white">
        <div className="mx-auto w-full max-w-2xl p-12 flex flex-col justify-center">
          <h2 className="text-3xl font-bold mb-6">Welcome to Dutch Thrift Consignor Portal</h2>
          <p className="text-lg mb-8">
            Manage your consigned items, track sales, and request payouts from one convenient dashboard.
          </p>
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="rounded-full bg-white/20 p-2">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"></path>
                  <path d="m12 14 2-2"></path>
                  <path d="M12 10V8"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold">Real-time Tracking</h3>
                <p className="mt-1 text-white/80">
                  Monitor your items as they move through our consignment process.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="rounded-full bg-white/20 p-2">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
                  <path d="M13 5v2"></path>
                  <path d="M13 17v2"></path>
                  <path d="M13 11v2"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold">Flexible Payouts</h3>
                <p className="mt-1 text-white/80">
                  Choose between cash payments or store credit with bonus value.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="rounded-full bg-white/20 p-2">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14"></path>
                  <path d="m12 5 7 7-7 7"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold">Easy Submissions</h3>
                <p className="mt-1 text-white/80">
                  Submit new items for consignment directly through the portal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}