"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckIcon, AlertTriangle, History, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

const formatSimpleDate = (timestamp) => {
  if (!timestamp) return "Never";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(timestamp));
  } catch (e) {
    return "Invalid Date";
  }
};

export function DockCard({ dock, isWeighing, liveWeight, onSelect }) {
  const router = useRouter();

  // Use live weight if this dock is being weighed, otherwise use saved weight
  const weight = isWeighing ? liveWeight : parseFloat(dock.weight || 0);

  // LED indicator for expiry (comes directly from DB)
  const isLedOn = Boolean(dock.led_state);

  // Status for weight
  const isWeightOk = weight > 3.2;

  const daysUntilExpiry = (() => {
    if (!dock.expires_at) return null;
    const expiryDate = new Date(dock.expires_at);
    const today = new Date();
    const diffTime = expiryDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  })();

  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

  const handleReweighClick = () => {
    if (dock && dock.id) {
      router.push(`/docks/${dock.id}`);
    }
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(dock);
    }
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all",
        isWeighing && "ring-2 ring-blue-500 shadow-lg"
      )}
      onClick={handleCardClick}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {dock.name}
            {isWeighing && (
              <span className="inline-flex items-center gap-1 text-xs font-normal bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full animate-pulse">
                <Radio className="h-3 w-3" />
                LIVE
              </span>
            )}
          </span>
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
              isWeightOk
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            )}
          >
            {dock.led_num}
          </div>
        </CardTitle>
        <CardDescription>{dock.location}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 pb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Weight</span>
          <span
            className={cn(
              "text-sm font-medium",
              isWeightOk ? "text-green-600" : "text-red-600",
              isWeighing && "font-bold"
            )}
          >
            {weight.toFixed(1)} kg
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">LED Status</span>
          <span
            className={cn(
              "flex items-center text-sm font-medium",
              isLedOn ? "text-red-600" : "text-green-600"
            )}
          >
            {isLedOn ? (
              <>
                <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Expiry LED ON
              </>
            ) : (
              <>
                <CheckIcon className="mr-1 h-3.5 w-3.5" /> Expiry LED OFF
              </>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Expiry</span>
          <span
            className={cn(
              "text-sm font-medium",
              isExpired
                ? "text-red-600"
                : isExpiringSoon
                ? "text-amber-600"
                : "text-green-600"
            )}
          >
            {daysUntilExpiry === null
              ? "N/A"
              : isExpired
              ? "Expired"
              : `${daysUntilExpiry} days`}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t mt-2">
          <span className="flex items-center">
            <History className="mr-1 h-3 w-3" /> Last Reviewed:
          </span>
          <span>{formatSimpleDate(dock.last_reweighed_at)}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleReweighClick} className="w-full">
          Details
        </Button>
      </CardFooter>
    </Card>
  );
}