import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, isLoading, loginAdmin, loginConsignor, register } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('consignorLogin');
  
  // Redirect if already logged in
  if (user && !isLoading) {
    if (user.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/consignor/dashboard');
    }
  }
  
  // Admin login form state
  const [adminForm, setAdminForm] = useState({
    email: '',
    password: ''
  });
  
  // Consignor login form state
  const [consignorLoginForm, setConsignorLoginForm] = useState({
    email: '',
    password: ''
  });
  
  // Consignor registration form state
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '', // Use single name field to match database structure
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: ''
  });
  
  // Basic email validation
  const isValidEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };
  
  // Handle admin login
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidEmail(adminForm.email) || !adminForm.password) {
      return; // Basic validation
    }
    
    // Add helper hint for the test admin account
    if (adminForm.email === 'admin@test.com') {
      console.log('Using test admin account');
    }
    
    loginAdmin.mutate({
      email: adminForm.email,
      password: adminForm.password
    });
  };
  
  // Handle consignor login
  const handleConsignorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidEmail(consignorLoginForm.email) || !consignorLoginForm.password) {
      return; // Basic validation
    }
    
    loginConsignor.mutate({
      email: consignorLoginForm.email,
      password: consignorLoginForm.password
    });
  };
  
  // Handle consignor registration
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation with detailed error logging
    if (!isValidEmail(registerForm.email)) {
      console.log('Registration validation failed: Invalid email format');
      return;
    }
    
    if (!registerForm.password) {
      console.log('Registration validation failed: Password is required');
      return;
    }
    
    if (registerForm.password !== registerForm.confirmPassword) {
      console.log('Registration validation failed: Passwords do not match');
      return;
    }
    
    if (!registerForm.name) {
      console.log('Registration validation failed: Name is required');
      return;
    }
    
    register.mutate({
      email: registerForm.email,
      password: registerForm.password,
      name: registerForm.name,
      phone: registerForm.phone,
      address: registerForm.address,
      city: registerForm.city,
      state: registerForm.state,
      postalCode: registerForm.postalCode,
      country: registerForm.country
    });
  };
  
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex flex-col md:flex-row w-full">
        {/* Left side - Auth forms */}
        <div className="flex items-center justify-center p-6 w-full md:w-1/2">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-primary">Dutch Thrift</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Premium Consignment Platform</p>
            </div>
            
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="consignorLogin">Consignor Login</TabsTrigger>
                <TabsTrigger value="adminLogin">Admin Login</TabsTrigger>
              </TabsList>
              
              {/* Consignor Login */}
              <TabsContent value="consignorLogin">
                <Card>
                  <CardHeader>
                    <CardTitle>Consignor Login</CardTitle>
                    <CardDescription>Enter your credentials to access your consignor account.</CardDescription>
                  </CardHeader>
                  <form onSubmit={handleConsignorLogin}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="consignorEmail">Email</Label>
                        <Input 
                          id="consignorEmail" 
                          type="email" 
                          placeholder="your@email.com" 
                          value={consignorLoginForm.email}
                          onChange={(e) => setConsignorLoginForm({...consignorLoginForm, email: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="consignorPassword">Password</Label>
                        <Input 
                          id="consignorPassword" 
                          type="password" 
                          placeholder="••••••••" 
                          value={consignorLoginForm.password}
                          onChange={(e) => setConsignorLoginForm({...consignorLoginForm, password: e.target.value})}
                          required
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginConsignor.isPending}
                      >
                        {loginConsignor.isPending ? 'Logging in...' : 'Login'}
                      </Button>
                      <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                        Don't have an account?{' '}
                        <a 
                          href="#" 
                          className="text-primary hover:underline"
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveTab('register');
                          }}
                        >
                          Register here
                        </a>
                      </p>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>
              
              {/* Admin Login */}
              <TabsContent value="adminLogin">
                <Card>
                  <CardHeader>
                    <CardTitle>Admin Login</CardTitle>
                    <CardDescription>Enter your admin credentials to access the control panel.</CardDescription>
                  </CardHeader>
                  <form onSubmit={handleAdminLogin}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="adminEmail">Email</Label>
                        <Input 
                          id="adminEmail" 
                          type="email" 
                          placeholder="admin@test.com" 
                          value={adminForm.email}
                          onChange={(e) => setAdminForm({...adminForm, email: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="adminPassword">Password</Label>
                        <Input 
                          id="adminPassword" 
                          type="password" 
                          placeholder="adminpass123" 
                          value={adminForm.password}
                          onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                          required
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginAdmin.isPending}
                      >
                        {loginAdmin.isPending ? 'Logging in...' : 'Login'}
                      </Button>
                      <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                        Use admin@test.com / adminpass123
                      </p>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>
              
              {/* Registration */}
              <TabsContent value="register">
                <Card>
                  <CardHeader>
                    <CardTitle>Create a Consignor Account</CardTitle>
                    <CardDescription>Enter your details to register as a consignor.</CardDescription>
                  </CardHeader>
                  <form onSubmit={handleRegister}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input 
                          id="fullName" 
                          placeholder="John Doe" 
                          value={registerForm.name}
                          onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="regEmail">Email</Label>
                        <Input 
                          id="regEmail" 
                          type="email" 
                          placeholder="your@email.com" 
                          value={registerForm.email}
                          onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="regPassword">Password</Label>
                          <Input 
                            id="regPassword" 
                            type="password" 
                            placeholder="••••••••" 
                            value={registerForm.password}
                            onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm Password</Label>
                          <Input 
                            id="confirmPassword" 
                            type="password" 
                            placeholder="••••••••" 
                            value={registerForm.confirmPassword}
                            onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number (optional)</Label>
                        <Input 
                          id="phone" 
                          type="tel" 
                          placeholder="+1 (555) 123-4567" 
                          value={registerForm.phone}
                          onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="address">Address (optional)</Label>
                        <Input 
                          id="address" 
                          placeholder="123 Main St" 
                          value={registerForm.address}
                          onChange={(e) => setRegisterForm({...registerForm, address: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City (optional)</Label>
                          <Input 
                            id="city" 
                            placeholder="Amsterdam" 
                            value={registerForm.city}
                            onChange={(e) => setRegisterForm({...registerForm, city: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State/Province (optional)</Label>
                          <Input 
                            id="state" 
                            placeholder="North Holland" 
                            value={registerForm.state}
                            onChange={(e) => setRegisterForm({...registerForm, state: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="postalCode">Postal Code (optional)</Label>
                          <Input 
                            id="postalCode" 
                            placeholder="1011 AB" 
                            value={registerForm.postalCode}
                            onChange={(e) => setRegisterForm({...registerForm, postalCode: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country (optional)</Label>
                          <Input 
                            id="country" 
                            placeholder="Netherlands" 
                            value={registerForm.country}
                            onChange={(e) => setRegisterForm({...registerForm, country: e.target.value})}
                          />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={register.isPending}
                      >
                        {register.isPending ? 'Registering...' : 'Register'}
                      </Button>
                      <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                        Already have an account?{' '}
                        <a 
                          href="#" 
                          className="text-primary hover:underline"
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveTab('consignorLogin');
                          }}
                        >
                          Login here
                        </a>
                      </p>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        {/* Right side - Hero section */}
        <div className="hidden md:flex items-center justify-center p-6 bg-primary/10 w-1/2">
          <div className="max-w-md text-center">
            <h2 className="text-3xl font-bold text-primary mb-6">Dutch Thrift Consignment Platform</h2>
            <div className="space-y-4 text-left">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <h3 className="font-semibold text-lg mb-2">Premium Consignment Services</h3>
                <p className="text-gray-600 dark:text-gray-300">Turn your quality unused items into cash with our expert consignment services. We handle everything from valuation to sale.</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <h3 className="font-semibold text-lg mb-2">AI-Powered Valuation</h3>
                <p className="text-gray-600 dark:text-gray-300">Our cutting-edge AI technology analyzes your items to provide accurate market values and optimal pricing strategies.</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <h3 className="font-semibold text-lg mb-2">Transparent Process</h3>
                <p className="text-gray-600 dark:text-gray-300">Track your consignments at every stage. From intake to payout, know exactly where your items are in the sales process.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}