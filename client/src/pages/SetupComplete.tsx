import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { DollarSign, Package, ShoppingBag } from "lucide-react";

export default function SetupComplete() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/10 to-white">
      <main className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6 md:p-8 text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">You're all set!</h1>
          <p className="text-gray-600 text-lg mb-8">
            We'll send you an email with your shipping label and instructions within the next 24 hours.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center text-center">
              <div className="bg-orange-100 text-orange-600 rounded-full p-3 mb-3">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">Pack</h3>
              <p className="text-gray-600 text-sm">
                Securely pack your item in a box
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center text-center">
              <div className="bg-blue-100 text-blue-600 rounded-full p-3 mb-3">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">Ship</h3>
              <p className="text-gray-600 text-sm">
                Attach label and drop off at carrier
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center text-center">
              <div className="bg-green-100 text-green-600 rounded-full p-3 mb-3">
                <DollarSign className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">Get Paid</h3>
              <p className="text-gray-600 text-sm">
                Receive payment when your item sells
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            Reference: {Math.floor(Math.random() * 10000).toString().padStart(4, '0')}
          </p>

          <Button
            onClick={() => navigate("/consignor/dashboard")}
            className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-bold py-3 px-6"
          >
            Go to My Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
}