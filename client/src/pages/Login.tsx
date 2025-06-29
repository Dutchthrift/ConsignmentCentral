import { useState } from "react";
import { Link, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";

// Import logo
import logoPath from "../assets/logo.png";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { loginMutation, user } = useAuth();
  
  // If user is already logged in, redirect to dashboard
  if (user) {
    if (user.role === UserRole.ADMIN) {
      navigate("/admin/dashboard");
    } else {
      navigate("/consignor/dashboard");
    }
  }
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  const onSubmit = (data: LoginFormValues) => {
    // Fix: Use email field instead of username for admin login
    loginMutation.mutate({
      email: data.email,
      password: data.password,
    });
  };
  
  return (
    <div className="flex min-h-screen bg-neutral-50 flex-col">
      <header className="flex items-center justify-center p-4 bg-white border-b border-neutral-200">
        <img src={logoPath} alt="Dutch Thrift Logo" className="h-10" />
      </header>
      
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <CardDescription>
              Login to access the Dutch Thrift admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="admin@dutchthrift.com" 
                          type="email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
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
                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Logging in..." : "Login"}
                </Button>
              </form>
            </Form>
            
            <div className="text-center mt-6 space-y-4">
              <div>
                <Link href="/auth" className="text-sm text-primary hover:underline">
                  Go to Consignor Login
                </Link>
              </div>
              <div className="pt-2">
                <Link href="/storefront" className="text-sm px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
                  Visit Storefront
                </Link>
              </div>
              <div className="pt-1">
                <Link href="/system-health" className="text-xs text-blue-500 hover:underline">
                  Check System Health
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <footer className="bg-white border-t border-neutral-200 p-4 text-center text-sm text-neutral-500">
        © {new Date().getFullYear()} Dutch Thrift. All rights reserved.
      </footer>
    </div>
  );
}
