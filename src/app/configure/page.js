"use client";

import { useState, useEffect } from "react";
import {
  ref,
  onValue,
  push,
  update,
  remove,
  query,
  orderByChild,
  serverTimestamp,
} from "firebase/database";
import { Shell } from "@/components/shell";
import { DockTable } from "@/components/dock-table";
import { DockForm } from "@/components/dock-form";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { ProtectedRoute } from "@/components/protected-route";

export default function ConfigurePage() {
  const [docks, setDocks] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDock, setSelectedDock] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    const docksRef = ref(db, "docks");
    const docksQuery = query(docksRef, orderByChild("created_at"));

    const unsubscribe = onValue(docksQuery, (snapshot) => {
      const data = snapshot.val();
      const docksArray = data
        ? Object.entries(data)
            .map(([id, value]) => ({
              id,
              ...value,
            }))
            .sort((a, b) => b.created_at - a.created_at)
        : [];

      setDocks(docksArray);
    });

    return () => unsubscribe();
  }, []);

  const handleCreate = async (data) => {
    try {
      const docksRef = ref(db, "docks");
      const newDockRef = push(docksRef);

      // Get the key BEFORE updating
      const newDockId = newDockRef.key;

      // Enforce correct initial values
      const weight = parseFloat(data.weight);
      // Handle NaN case
      const validWeight = isNaN(weight) ? 4.5 : weight;

      // LED state depends on expiry (<=5 days). At creation we default to OFF; a cron will update later.
      const initialLedState = false;

      console.log(
        `Creating dock with weight=${validWeight}, led_state=${initialLedState}`
      );

      await update(newDockRef, {
        ...data,
        id: newDockId, // Explicitly store ID in the data
        weight: validWeight,
        led_state: initialLedState,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      console.log("Created dock with ID:", newDockId);
    } catch (error) {
      console.error("Error creating dock:", error);
    }
  };

  const handleUpdate = async (data) => {
    if (!selectedDock) return;
    try {
      const dockRef = ref(db, `docks/${selectedDock.id}`);

      // Ensure LED state is consistent with weight when updating
      const weight = parseFloat(data.weight);
      // Handle NaN case
      const validWeight = isNaN(weight) ? 4.5 : weight;

      // LED state now depends on expiry; leave unchanged during update.
      const ledState = selectedDock.led_state ?? false;

      console.log(
        `Updating dock ${selectedDock.id}: weight=${validWeight}, led_state=${ledState}`
      );

      await update(dockRef, {
        ...data,
        weight: validWeight,
        led_state: ledState,
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating dock:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const dockRef = ref(db, `docks/${id}`);
      await remove(dockRef);
    } catch (error) {
      console.error("Error deleting dock:", error);
    }
  };

  const handleRemoveAllDocks = async () => {
    if (
      window.confirm(
        "Are you sure you want to remove ALL docks? This action cannot be undone."
      )
    ) {
      setIsRemoving(true);
      try {
        const docksRef = ref(db, "docks");
        await remove(docksRef);
        console.log("All docks have been removed successfully");
      } catch (error) {
        console.error("Error removing all docks:", error);
      } finally {
        setIsRemoving(false);
      }
    }
  };

  const handleEdit = (dock) => {
    setSelectedDock(dock);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setSelectedDock(null);
    setIsFormOpen(false);
  };

  const handleFormSubmit = (data) => {
    if (selectedDock) {
      handleUpdate(data);
    } else {
      handleCreate(data);
    }
  };

  return (
    <ProtectedRoute>
      <Shell title="Configure Docks">
        <div className="rounded-lg border bg-card">
          <div className="p-4 flex justify-between items-center">
            <div className="flex gap-2">
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Dock
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveAllDocks}
                disabled={isRemoving || docks.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isRemoving ? "Removing..." : "Remove All Docks"}
              </Button>
            </div>
          </div>
          <div className="border-t">
            <DockTable
              docks={docks}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </div>
        <DockForm
          isOpen={isFormOpen}
          onClose={handleFormClose}
          onSubmit={handleFormSubmit}
          initialData={selectedDock}
        />
      </Shell>
    </ProtectedRoute>
  );
}
