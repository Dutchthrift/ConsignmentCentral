import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";

export default function ApiStatus() {
  const apiStatuses = [
    {
      name: "OpenAI GPT-4 Vision",
      status: "operational",
      icon: <CheckCircle className="text-green-500 h-4 w-4 mr-2" />,
    },
    {
      name: "eBay Price API",
      status: "operational",
      icon: <CheckCircle className="text-green-500 h-4 w-4 mr-2" />,
    },
    {
      name: "Sendcloud API",
      status: "limited",
      icon: <AlertTriangle className="text-amber-500 h-4 w-4 mr-2" />,
    },
    {
      name: "Shopify Webhooks",
      status: "operational",
      icon: <CheckCircle className="text-green-500 h-4 w-4 mr-2" />,
    },
    {
      name: "Stripe Connect",
      status: "issue",
      icon: <AlertCircle className="text-red-500 h-4 w-4 mr-2" />,
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Operational
          </Badge>
        );
      case "limited":
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-800">
            Rate limited
          </Badge>
        );
      case "issue":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            Configuration needed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            Unknown
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">API Integrations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {apiStatuses.map((api, index) => (
            <div
              key={index}
              className="flex items-center justify-between"
            >
              <div className="flex items-center">
                {api.icon}
                <span className="text-sm">{api.name}</span>
              </div>
              {getStatusBadge(api.status)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
