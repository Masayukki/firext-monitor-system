"use client";

import { useEffect, useState } from "react";
import {
  ref,
  onValue,
  query,
  orderByChild,
  update,
} from "firebase/database";
import { Shell } from "@/components/shell";
import { DockCard } from "@/components/dock-card";
import { db } from "@/lib/firebase";
import { ProtectedRoute } from "@/components/protected-route";
import { useWeighingStation } from "@/hooks/useWeighingStation";
import { Radio, CheckCircle2, Clock } from "lucide-react";

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

  // Add weighing station hook
  const {
    selectedDock,
    currentWeight,
    selectDock,
    saveStatus,
    saveWeight,
    canSave, // NEW: Check if save is allowed
  } = useWeighingStation();

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
        {/* Real-time Weight Status Banner */}
        {selectedDock && (
          <div className="mb-6 rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Radio className="h-5 w-5 animate-pulse text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Currently Weighing
                  </p>
                  <p className="text-lg font-bold text-blue-600">
                    {selectedDock.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Live Weight</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {currentWeight.toFixed(1)}{" "}
                    <span className="text-lg text-gray-500">kg</span>
                  </p>
                </div>

                <div className="h-12 w-px bg-gray-300" />

                <div className="text-right min-w-[160px]">
                  {saveStatus === "saving" ? (
                    <div className="flex items-center gap-2 text-blue-600">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      <p className="text-lg font-medium">Saving...</p>
                    </div>
                  ) : saveStatus === "saved" ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-6 w-6" />
                      <p className="text-lg font-bold">Saved!</p>
                    </div>
                  ) : saveStatus === "error" ? (
                    <div className="flex items-center gap-2 text-red-600">
                      <p className="text-sm font-medium">Error saving</p>
                    </div>
                  ) : (
                    <button
                      onClick={saveWeight}
                      disabled={currentWeight <= 0 || !canSave}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
                    >
                      {!canSave ? 'Wait...' : 'Save Weight'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dock Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docks.map((dock) => (
            <DockCard
              key={dock.id}
              dock={dock}
              formatSimpleDate={formatSimpleDate}
              // Add real-time weight props
              isWeighing={selectedDock?.id === dock.id}
              liveWeight={currentWeight}
              onSelect={selectDock}
            />
          ))}
        </div>
      </Shell>
    </ProtectedRoute>
  );
}