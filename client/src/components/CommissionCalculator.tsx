import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";

interface CommissionResult {
  eligible: boolean;
  commissionRate?: number;
  commissionAmount?: number;
  payoutAmount?: number;
  payoutType?: string;
  message?: string;
}

export default function CommissionCalculator() {
  const [salePrice, setSalePrice] = useState<number>(200);
  const [payoutType, setPayoutType] = useState<string>("cash");
  const [result, setResult] = useState<CommissionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Calculate commission whenever price or payout type changes
  useEffect(() => {
    calculateCommission();
  }, [salePrice, payoutType]);

  const calculateCommission = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/commission-calculator?price=${salePrice}&type=${payoutType}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.success) {
        setResult(data.data);
      } else {
        console.error("Error calculating commission:", data?.message || "Unknown error");
      }
    } catch (error) {
      console.error("Error calculating commission:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get tier description based on sale price for the sliding scale
  const getTierDescription = (price: number): string => {
    if (price < 50) return "Not eligible for consignment";
    if (price < 100) {
      const rate = 50 - ((price - 50) / 50) * 10;
      return `Sliding scale: ~${rate.toFixed(1)}% commission`;
    }
    if (price < 200) {
      const rate = 40 - ((price - 100) / 100) * 10;
      return `Sliding scale: ~${rate.toFixed(1)}% commission`;
    }
    if (price < 500) {
      const rate = 30 - ((price - 200) / 300) * 10;
      return `Sliding scale: ~${rate.toFixed(1)}% commission`;
    }
    return "Flat rate: 20% commission";
  };

  // Format currency
  const formatCurrency = (amount?: number): string => {
    if (amount === undefined) return "€0.00";
    return `€${amount.toFixed(2)}`;
  };

  // Handle manual input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setSalePrice(value);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          <span className="bg-gradient-to-r from-[hsl(var(--dutch-yellow))] to-[hsl(var(--dutch-orange))] text-transparent bg-clip-text">
            Commission Calculator
          </span>
        </CardTitle>
        <CardDescription>
          Estimate your payout based on the expected sale price
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="sale-price">Expected Sale Price</Label>
              <div className="text-sm text-muted-foreground">
                {getTierDescription(salePrice)}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Slider
                  id="price-slider"
                  min={0}
                  max={1000}
                  step={10}
                  value={[salePrice]}
                  onValueChange={(vals) => setSalePrice(vals[0])}
                />
              </div>
              <div className="w-24">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    €
                  </span>
                  <Input
                    type="number"
                    id="sale-price"
                    value={salePrice}
                    onChange={handleInputChange}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payout Method</Label>
            <Tabs
              defaultValue="cash"
              value={payoutType}
              onValueChange={setPayoutType}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cash">Cash</TabsTrigger>
                <TabsTrigger value="storecredit">
                  Store Credit (+10%)
                </TabsTrigger>
              </TabsList>
              <TabsContent value="cash">
                <p className="text-sm text-muted-foreground mt-2">
                  Receive your payout in cash after your item sells
                </p>
              </TabsContent>
              <TabsContent value="storecredit">
                <p className="text-sm text-muted-foreground mt-2">
                  Receive 10% extra when you choose store credit
                </p>
              </TabsContent>
            </Tabs>
          </div>

          {/* Results display */}
          {result && (
            <div className="rounded-lg border p-4 bg-accent/50">
              {result.eligible ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-lg font-medium">Commission Rate</p>
                    <p className="text-3xl font-bold">{result.commissionRate}%</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Our Commission</p>
                      <p className="text-xl font-bold">{formatCurrency(result.commissionAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Your Payout</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(result.payoutAmount)}
                      </p>
                    </div>
                  </div>
                  
                  {payoutType === "storecredit" && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        Includes a 10% bonus compared to cash payout
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-red-500 font-medium">{result.message}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    We recommend items with a resale value of at least €50
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Note: Final payouts may vary based on actual sale price and condition assessment. 
          Store credit bonus is applied to your final payout after the item sells.
        </p>
      </CardFooter>
    </Card>
  );
}