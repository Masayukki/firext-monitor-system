"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DockForm({ isOpen, onClose, onSubmit, initialData }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      location: "",
      weight: 4.5,
      expires_at: "",
      led_num: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      const safeDate = initialData.expires_at
        ? (() => {
            const d = new Date(initialData.expires_at);
            return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
          })()
        : "";

      reset({
        ...initialData,
        expires_at: safeDate,
      });
    }
  }, [initialData, reset]);

  const onSubmitForm = (data) => {
    onSubmit({
      ...data,
      weight: Number(data.weight),
      led_num: Number(data.led_num),
      expires_at: new Date(data.expires_at).toISOString(),
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Dock" : "Add Dock"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...register("location", { required: "Location is required" })}
            />
            {errors.location && (
              <p className="text-sm text-red-500">{errors.location.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              {...register("weight", {
                required: "Weight is required",
                min: { value: 0, message: "Weight must be at least 0" },
                max: { value: 10, message: "Weight cannot exceed 10 kg" },
                validate: (value) =>
                  !isNaN(value) || "Weight must be a valid number",
              })}
            />
            {errors.weight && (
              <p className="text-sm text-red-500">{errors.weight.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="expires_at">Expiration Date</Label>
            <Input
              id="expires_at"
              type="date"
              {...register("expires_at", {
                required: "Expiration date is required",
              })}
            />
            {errors.expires_at && (
              <p className="text-sm text-red-500">
                {errors.expires_at.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="led_num">LED Number</Label>
            <Input
              id="led_num"
              type="number"
              {...register("led_num", {
                required: "LED number is required",
                validate: (value) =>
                  !isNaN(value) || "LED number must be a valid number",
              })}
            />
            {errors.led_num && (
              <p className="text-sm text-red-500">{errors.led_num.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{initialData ? "Update" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
