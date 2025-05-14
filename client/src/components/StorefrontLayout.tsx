import React from "react";
import { Link } from "wouter";
import logoPath from "../assets/logo.png";

type StorefrontLayoutProps = {
  children: React.ReactNode;
};

export default function StorefrontLayout({ children }: StorefrontLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <img src={logoPath} alt="Dutch Thrift Logo" className="h-12 mr-4" />
            <span className="text-xl font-medium">Dutch Thrift</span>
          </div>
          <nav>
            <ul className="flex space-x-6">
              <li><Link href="/storefront" className="text-primary hover:text-primary/80">Home</Link></li>
              <li><Link href="/storefront#how-it-works" className="text-gray-600 hover:text-primary">How It Works</Link></li>
              <li><Link href="/storefront#faq" className="text-gray-600 hover:text-primary">FAQ</Link></li>
              <li><Link href="/intake" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">Sell With Us</Link></li>
            </ul>
          </nav>
        </div>
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