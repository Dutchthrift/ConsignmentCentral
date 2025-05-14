import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Brain, DollarSign, Truck, ArrowRight } from "lucide-react";

export default function ProcessSteps() {
  const steps = [
    {
      icon: <Camera className="text-white h-5 w-5" />,
      title: "Intake Submission",
      description: "Customer uploads product photos",
    },
    {
      icon: <Brain className="text-white h-5 w-5" />,
      title: "AI Analysis",
      description: "GPT-4 identifies product details",
    },
    {
      icon: <DollarSign className="text-white h-5 w-5" />,
      title: "Market Research",
      description: "eBay API checks market prices",
    },
    {
      icon: <Truck className="text-white h-5 w-5" />,
      title: "Shipping",
      description: "Label generation via Sendcloud",
    },
  ];

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Consignment Process</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row justify-between">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center mb-6 md:mb-0 flex-1">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mb-2">
                {step.icon}
              </div>
              <h3 className="text-sm font-medium">{step.title}</h3>
              <p className="text-xs text-neutral-500 text-center mt-1">
                {step.description}
              </p>
              
              {index < steps.length - 1 && (
                <div className="hidden md:flex w-12 flex-shrink-0 items-center justify-center">
                  <ArrowRight className="text-neutral-400 h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
