import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardStats } from "@shared/schema";
import {
  Package,
  Clock,
  EyeIcon,
  ShoppingCart,
  ArrowUpIcon,
  ArrowDownIcon,
} from "lucide-react";

interface StatsOverviewProps {
  stats: DashboardStats;
  isLoading: boolean;
}

export default function StatsOverview({ stats, isLoading }: StatsOverviewProps) {
  const statCards = [
    {
      title: "Total Intakes",
      value: stats.totalIntakes,
      icon: <Package className="text-primary" />,
      change: {
        value: 12,
        isPositive: true,
      },
      bgColor: "bg-primary-light bg-opacity-20",
      iconColor: "text-primary",
    },
    {
      title: "Pending Analysis",
      value: stats.pendingAnalysis,
      icon: <Clock className="text-amber-500" />,
      change: {
        value: 3,
        isPositive: false,
      },
      bgColor: "bg-amber-100",
      iconColor: "text-amber-500",
    },
    {
      title: "Active Listings",
      value: stats.activeListings,
      icon: <EyeIcon className="text-green-600" />,
      change: {
        value: 8,
        isPositive: true,
      },
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Sold Items",
      value: stats.soldItems,
      icon: <ShoppingCart className="text-purple-600" />,
      change: {
        value: 15,
        isPositive: true,
      },
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 text-sm">{stat.title}</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-medium">{stat.value}</p>
                )}
              </div>
              <div
                className={`w-10 h-10 rounded-full ${stat.bgColor} flex items-center justify-center`}
              >
                {stat.icon}
              </div>
            </div>
            <div className="flex items-center mt-2">
              <span
                className={`${
                  stat.change.isPositive ? "text-green-500" : "text-red-500"
                } text-sm flex items-center`}
              >
                {stat.change.isPositive ? (
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3 mr-1" />
                )}
                {stat.change.value}%
              </span>
              <span className="text-neutral-500 text-sm ml-1">
                from last month
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
