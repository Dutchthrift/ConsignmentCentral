import React, { useState } from "react";
import { Link } from "wouter";
import logoPath from "../assets/dutch_thrift_logo.jpeg";
import { Menu, X } from "lucide-react";

type StorefrontLayoutProps = {
  children: React.ReactNode;
};

export default function StorefrontLayout({ children }: StorefrontLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <img src={logoPath} alt="Dutch Thrift Logo" className="h-10 md:h-12 mr-2 md:mr-4" />
            <span className="text-lg md:text-xl font-medium">Dutch Thrift</span>
          </div>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2 focus:outline-none"
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-700" />
            ) : (
              <Menu className="h-6 w-6 text-gray-700" />
            )}
          </button>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:block">
            <ul className="flex space-x-6">
              <li><Link href="/storefront" className="text-primary hover:text-primary/80">Home</Link></li>
              <li><Link href="/storefront#how-it-works" className="text-gray-600 hover:text-primary">How It Works</Link></li>
              <li><Link href="/storefront#faq" className="text-gray-600 hover:text-primary">FAQ</Link></li>
              <li><Link href="/intake" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">Sell With Us</Link></li>
            </ul>
          </nav>
        </div>
        
        {/* Mobile Navigation Menu - Shows when mobileMenuOpen is true */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-2 px-4 bg-white">
            <ul className="flex flex-col space-y-3 pb-2">
              <li><Link href="/storefront" className="block py-2 text-primary hover:text-primary/80">Home</Link></li>
              <li><Link href="/storefront#how-it-works" className="block py-2 text-gray-600 hover:text-primary">How It Works</Link></li>
              <li><Link href="/storefront#faq" className="block py-2 text-gray-600 hover:text-primary">FAQ</Link></li>
              <li className="pt-2">
                <Link href="/intake" className="block text-center py-2 bg-primary text-white rounded-md hover:bg-primary/90">
                  Sell With Us
                </Link>
              </li>
            </ul>
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <main>
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-neutral-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <img src={logoPath} alt="Dutch Thrift Logo" className="h-10 mb-2" />
              <p className="text-sm text-gray-400">© {new Date().getFullYear()} Dutch Thrift. All rights reserved.</p>
            </div>
            <div className="flex space-x-6">
              <Link href="/storefront" className="text-gray-400 hover:text-white">Home</Link>
              <Link href="/storefront#how-it-works" className="text-gray-400 hover:text-white">How It Works</Link>
              <Link href="/storefront#faq" className="text-gray-400 hover:text-white">FAQ</Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</Link>
              <Link href="/terms" className="text-gray-400 hover:text-white">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}