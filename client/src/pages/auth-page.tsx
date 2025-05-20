import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@shared/schema";

interface AuthFormData {
  email: string;
  password: string;
  name?: string;
}

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("login");

  // If user is already logged in, redirect to home page
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const loginForm = useForm<AuthFormData>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<AuthFormData>({
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  const onLoginSubmit = async (data: AuthFormData) => {
    try {
      // Convert to expected format for loginMutation
      await loginMutation.mutateAsync({
        username: data.email,
        password: data.password
      });
      
      toast({
        title: "Login successful",
        description: "You have been logged in successfully",
      });
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again",
        variant: "destructive",
      });
    }
  };

  const onRegisterSubmit = async (data: AuthFormData) => {
    try {
      if (!data.name) {
        throw new Error("Name is required");
      }
      
      // Convert to expected format for registerMutation
      await registerMutation.mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password,
        role: UserRole.CONSIGNOR, // Default role for new users is consignor
        provider: 'local'
      });
      
      toast({
        title: "Registration successful",
        description: "Your account has been created successfully",
      });
      navigate("/");
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: "Please check your details and try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left column - Auth forms */}
      <div className="flex w-full md:w-1/2 flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">Dutch Thrift</h1>
          <p className="text-muted-foreground">Consignment Platform</p>
        </div>

        <Tabs
          defaultValue="login"
          className="w-full max-w-md"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          {/* Login Form */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your.email@example.com"
                      {...loginForm.register("email", {
                        required: "Email is required",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Invalid email address",
                        },
                      })}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-red-500">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      {...loginForm.register("password", {
                        required: "Password is required",
                        minLength: {
                          value: 6,
                          message: "Password must be at least 6 characters",
                        },
                      })}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-500">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Logging in..." : "Login"}
                  </Button>
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      className="underline text-primary"
                      onClick={() => setActiveTab("register")}
                    >
                      Register
                    </button>
                  </p>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          {/* Register Form */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>
                  Enter your details to create a new account
                </CardDescription>
              </CardHeader>
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Name</Label>
                    <Input
                      id="register-name"
                      placeholder="Your name"
                      {...registerForm.register("name", {
                        required: "Name is required",
                      })}
                    />
                    {registerForm.formState.errors.name && (
                      <p className="text-sm text-red-500">
                        {registerForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="your.email@example.com"
                      {...registerForm.register("email", {
                        required: "Email is required",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Invalid email address",
                        },
                      })}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-red-500">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      {...registerForm.register("password", {
                        required: "Password is required",
                        minLength: {
                          value: 6,
                          message: "Password must be at least 6 characters",
                        },
                      })}
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-red-500">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col">
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Creating account..." : "Create account"}
                  </Button>
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="underline text-primary"
                      onClick={() => setActiveTab("login")}
                    >
                      Login
                    </button>
                  </p>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right column - Hero section */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-primary to-primary-foreground">
        <div className="flex flex-col items-center justify-center px-12 py-16 text-white">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">Dutch Thrift</h1>
            <h2 className="text-2xl mb-6">Consignment Platform</h2>
            <p className="text-lg mb-6">
              The smart way to consign and sell your premium items
            </p>
            <ul className="space-y-3 text-lg">
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                AI-powered product analysis
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Fair market value assessment
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Simple shipping process
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Transparent commission system
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}