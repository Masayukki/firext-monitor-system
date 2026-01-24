"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ref,
  onValue,
  update,
  set,
  remove,
  serverTimestamp,
} from "firebase/database";
import { db } from "@/lib/firebase";
import { Shell } from "@/components/shell";
import { ProtectedRoute } from "@/components/protected-route";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Clock,
  Weight,
  MapPin,
  CalendarOff,
} from "lucide-react";

// Define weight thresholds
const WEIGHT_THRESHOLD_LOW = 3.2;
const WEIGHT_THRESHOLD_MID_UPPER = 4.1;

// --- Define Status Thresholds ---
const STATUS_LOW_UPPER_BOUND = 3.3;
const STATUS_MID_UPPER_BOUND = 4.4; // Changed from 4.1 for status
const STATUS_FULL_LOWER_BOUND = 4.5; // Added for clarity
// --- End Status Thresholds ---

// Helper function to format dates
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(dateString));
  } catch (error) {
    console.error("Invalid date format:", dateString, error);
    return "Invalid date";
  }
};

// Helper function to determine Status
const getWeightStatus = (weight) => {
  const weightNum = parseFloat(weight || 0);
  if (weightNum < STATUS_LOW_UPPER_BOUND) {
    return "Low";
  }
  if (
    weightNum >= STATUS_LOW_UPPER_BOUND &&
    weightNum <= STATUS_MID_UPPER_BOUND
  ) {
    return "Mid";
  }
  // No need for explicit check >= STATUS_FULL_LOWER_BOUND, as it's the remaining case
  return "Full";
};

// LED Status Indicator Component
function WeightStatusIndicator({ weight }) {
  const weightNum = parseFloat(weight || 0);
  let status = "low"; // Default to low if weight is 0 or <= 3.2
  let color = "red";

  if (weightNum > WEIGHT_THRESHOLD_MID_UPPER) {
    status = "full";
    color = "green";
  } else if (weightNum > WEIGHT_THRESHOLD_LOW) {
    status = "mid";
    color = "yellow";
  }

  const indicators = [
    { label: "Low", status: "low", color: "red" },
    { label: "Mid", status: "mid", color: "yellow" },
    { label: "Full", status: "full", color: "green" },
  ];

  // Define Tailwind classes for dynamic background/border colors
  const colorClasses = {
    red: "bg-red-500 border-red-700 text-red-700",
    yellow: "bg-yellow-500 border-yellow-700 text-yellow-700",
    green: "bg-green-500 border-green-700 text-green-700",
    gray: "bg-gray-200 border-gray-400 text-gray-500",
  };

  return (
    <div className="flex space-x-4 items-center">
      {indicators.map((indicator) => {
        const isActive = status === indicator.status;
        const activeBgBorder = isActive
          ? colorClasses[indicator.color].split(" ")[0] +
            " " +
            colorClasses[indicator.color].split(" ")[1] +
            " scale-110"
          : colorClasses.gray.split(" ")[0] +
            " " +
            colorClasses.gray.split(" ")[1];
        const activeText = isActive
          ? colorClasses[indicator.color].split(" ")[2]
          : colorClasses.gray.split(" ")[2];

        return (
          <div key={indicator.status} className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${activeBgBorder}`}
            >
              {isActive && (
                <div className={`w-3 h-3 rounded-full bg-white`}></div>
              )}
            </div>
            <span className={`mt-1 text-xs font-medium ${activeText}`}>
              {indicator.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function DockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [dock, setDock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const dockId = params?.id;

  useEffect(() => {
    if (!dockId) {
      setError("Dock ID not found.");
      setLoading(false);
      return;
    }

    const dockRef = ref(db, `docks/${dockId}`);

    // On entering the page, command the firmware to show color
    update(dockRef, { isReweighing: true });

    const unsubscribe = onValue(
      dockRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setDock({ id: dockId, ...data });
          setError(null);

          const currentWeight = parseFloat(data.weight || 0);
          // --- Calculate Status ---
          const currentStatus = getWeightStatus(currentWeight);
          // --- End Calculate Status ---

          // This page's only job is to acknowledge the reweigh alert.
          update(dockRef, {
            isBlinking: false,
            last_reweighed_at: serverTimestamp(),
          });
        } else {
          setError("Dock not found.");
          setDock(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Firebase read error on dock data:", err);
        setError("Failed to load dock data.");
        setLoading(false);
      }
    );

    // On leaving the page, command the firmware to turn color OFF
    return () => {
      unsubscribe();
      update(dockRef, { isReweighing: false });
    };
  }, [dockId]);

  const weight = parseFloat(dock?.weight || 0);
  const isLedOn = Boolean(dock?.led_state);

  const daysUntilExpiry = (() => {
    if (!dock?.expires_at) return null;
    const expiryDate = new Date(dock.expires_at);
    const today = new Date();
    const diffTime = expiryDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  })();

  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;
  const expiryText =
    daysUntilExpiry === null
      ? "N/A"
      : isExpired
      ? "Expired"
      : `${daysUntilExpiry} days remaining`;
  const expiryColor = isExpired
    ? "text-red-600"
    : daysUntilExpiry !== null && daysUntilExpiry <= 30
    ? "text-amber-600"
    : "text-green-600";

  return (
    <ProtectedRoute>
      <Shell
        title={
          loading
            ? "Loading Dock..."
            : dock
            ? `Reweighing: ${dock.name}`
            : "Dock Not Found"
        }
      >
        {loading && (
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-6 w-1/2" />
            </CardContent>
          </Card>
        )}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5" /> Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
              <Button onClick={() => router.push("/")} className="mt-4">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
        {!loading && dock && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{dock.name}</CardTitle>
              <CardDescription className="flex items-center text-muted-foreground">
                <MapPin className="mr-1 h-4 w-4" /> {dock.location}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Weight Status</h3>
                <WeightStatusIndicator weight={dock.weight} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Weight className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Current Weight:</span>
                  <span>{weight.toFixed(1)} kg</span>
                </div>
                <div className="flex items-center space-x-2">
                  <AlertTriangle
                    className={`h-5 w-5 ${
                      dock?.ledstatus?.redActive
                        ? "text-red-500"
                        : dock?.ledstatus?.yellowActive
                        ? "text-yellow-500"
                        : dock?.ledstatus?.greenActive
                        ? "text-green-500"
                        : "text-gray-400"
                    }`}
                  />
                  <span className="font-medium">
                    LED Status ({dock.led_num || "N/A"}):
                  </span>
                  <span
                    className={`${
                      dock?.ledstatus?.redActive
                        ? "text-red-600"
                        : dock?.ledstatus?.yellowActive
                        ? "text-yellow-600"
                        : dock?.ledstatus?.greenActive
                        ? "text-green-600"
                        : "text-gray-500"
                    } font-semibold`}
                  >
                    {dock?.ledstatus?.redActive
                      ? "ON (Low Weight)"
                      : dock?.ledstatus?.yellowActive
                      ? "ON (Mid Weight)"
                      : dock?.ledstatus?.greenActive
                      ? "ON (Full Weight)"
                      : "OFF"}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CalendarOff className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Expiration:</span>
                  <span className={`${expiryColor} font-semibold`}>
                    {expiryText}
                  </span>{" "}
                  ({formatDate(dock.expires_at)})
                </div>
              </div>

              <div className="text-xs text-muted-foreground pt-4 border-t">
                <p>Dock ID: {dock.id}</p>
                <p>Last Updated: {formatDate(dock.updated_at)}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </Shell>
    </ProtectedRoute>
  );
}
