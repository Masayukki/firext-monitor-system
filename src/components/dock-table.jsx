"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Trash2, Copy, Check, Lightbulb, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function DockTable({ docks, onEdit, onDelete }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  // Ensure docks is an array
  const safeDocksArray = Array.isArray(docks) ? docks : [];

  const filteredDocks = safeDocksArray.filter((dock) => {
    // Check if dock is valid and has required properties
    if (!dock || typeof dock !== "object") return false;

    const name = dock.name || "";
    const location = dock.location || "";
    const query = searchQuery.toLowerCase();

    try {
      return (
        name.toString().toLowerCase().includes(query) ||
        location.toString().toLowerCase().includes(query)
      );
    } catch (error) {
      console.error("Error filtering dock:", dock, error);
      return false;
    }
  });

  const handleCopyId = async (id) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (date) => {
    if (!date) return "Not set";

    try {
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }).format(new Date(date));
    } catch (error) {
      console.error("Invalid date format:", date, error);
      return "Invalid date";
    }
  };

  const formatWeight = (weight) => {
    if (weight === undefined || weight === null) return "N/A";
    try {
      return Number(weight).toFixed(1);
    } catch (error) {
      console.error("Invalid weight format:", weight, error);
      return "Invalid";
    }
  };

  const getWeightClass = (weight) => {
    if (weight === undefined || weight === null) return "text-gray-500";
    try {
      const numWeight = Number(weight);
      if (numWeight > 4.1) return "text-green-500";
      if (numWeight > 3.2) return "text-yellow-500";
      return "text-red-500";
    } catch (error) {
      return "text-gray-500";
    }
  };

  const getLedStatusClass = (ledState) => {
    return ledState ? "text-red-500" : "text-green-500";
  };

  const renderEmptyState = () => {
    if (safeDocksArray.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="h-24 text-center">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <div className="rounded-full bg-muted p-3 mb-2">
                <Search className="h-5 w-5" />
              </div>
              <p>No docks available</p>
              <p className="text-sm">Add a new dock to get started</p>
            </div>
          </TableCell>
        </TableRow>
      );
    } else if (filteredDocks.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="h-24 text-center">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <div className="rounded-full bg-muted p-3 mb-2">
                <Search className="h-5 w-5" />
              </div>
              <p>No matching docks found</p>
              <p className="text-sm">Try changing your search query</p>
            </div>
          </TableCell>
        </TableRow>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="flex items-center gap-4 p-4">
        <Input
          placeholder="Search docks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Weight (kg)</TableHead>
            <TableHead>LED Status</TableHead>
            <TableHead>Expiration Date</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {renderEmptyState() ||
            filteredDocks.map((dock) => (
              <TableRow key={dock.id || Math.random().toString()}>
                <TableCell className="font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[80px]">{dock.id}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleCopyId(dock.id)}
                    >
                      {copiedId === dock.id ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{dock.name}</TableCell>
                <TableCell>{dock.location}</TableCell>
                <TableCell>
                  <span className={getWeightClass(dock.weight)}>
                    {formatWeight(dock.weight)} kg
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Lightbulb
                      className={cn(
                        "h-4 w-4",
                        getLedStatusClass(dock.led_state)
                      )}
                    />
                    <span className={getLedStatusClass(dock.led_state)}>
                      {dock.led_state
                        ? "ON"
                        : dock.toReweigh?.status === "needTo"
                        ? "BLINK"
                        : "OFF"}{" "}
                      (#
                      {dock.led_num || "N/A"})
                    </span>
                  </div>
                </TableCell>
                <TableCell>{formatDate(dock.expires_at)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(dock)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(dock.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
