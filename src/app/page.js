"use client";

import { useEffect, useState } from "react";
import {
  ref,
  onValue,
  query,
  orderByChild,
  update,
  set,
} from "firebase/database";
import { Shell } from "@/components/shell";
import { DockCard } from "@/components/dock-card";
import { db } from "@/lib/firebase";
import { ProtectedRoute } from "@/components/protected-route";
import { toast } from "sonner";
import { Clock } from "lucide-react";

const calculateDaysUntilExpiry = (expiryDateString) => {
  if (!expiryDateString) return null;
  const expiryDate = new Date(expiryDateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);
  const diffTime = expiryDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const formatSimpleDate = (timestamp) => {
  if (!timestamp) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
};

export default function DashboardPage() {
  const [docks, setDocks] = useState([]);

  useEffect(() => {
    const docksRef = ref(db, "docks");
    const docksQuery = query(docksRef, orderByChild("expires_at"));

    const unsubscribe = onValue(docksQuery, (snapshot) => {
      const data = snapshot.val();
      const docksArray = data
        ? Object.entries(data).map(([id, value]) => ({ id, ...value }))
        : [];

      setDocks(docksArray);

      docksArray.forEach((dock) => {
        const daysLeft = calculateDaysUntilExpiry(dock.expires_at);
        const needsReweigh = !dock.last_reweighed_at;
        const isNearingExpiry = daysLeft !== null && daysLeft <= 5;

        const updatePayload = {
          isBlinking: needsReweigh,
          isNearExpiry: isNearingExpiry,
          isReweighing: false, // Failsafe
        };

        const dockRef = ref(db, `docks/${dock.id}`);
        update(dockRef, updatePayload);
      });
    });

    return () => unsubscribe();
  }, []);

  return (
    <ProtectedRoute>
      <Shell title="Dashboard">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docks.map((dock) => (
            <DockCard
              key={dock.id}
              dock={dock}
              formatSimpleDate={formatSimpleDate}
            />
          ))}
        </div>
      </Shell>
    </ProtectedRoute>
  );
}
