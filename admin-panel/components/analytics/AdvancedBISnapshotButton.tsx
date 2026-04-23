"use client";

import { useTransition } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { AdvancedBISnapshotRangeKey } from "@/lib/bi-snapshot";

interface AdvancedBISnapshotButtonProps {
  currentView: {
    coachId: string | null;
    coachName: string | null;
    packId: string | null;
    packName: string | null;
    rangeKey: AdvancedBISnapshotRangeKey;
  };
}

export default function AdvancedBISnapshotButton({
  currentView,
}: AdvancedBISnapshotButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleSendSnapshot = () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/bi/snapshot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(currentView),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload.error || "Failed to send BI snapshot notification."
          );
        }

        window.dispatchEvent(new Event("admin-notifications:refresh"));
        toast.success(
          payload.message || "BI snapshot sent to your notifications."
        );
      } catch (error) {
        console.error("Failed to send BI snapshot notification:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to send BI snapshot notification."
        );
      }
    });
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-8 rounded-full px-3 text-xs"
      disabled={isPending}
      onClick={handleSendSnapshot}
    >
      <BellRing className="mr-1.5 h-3.5 w-3.5" />
      {isPending ? "Sending..." : "Send Snapshot"}
    </Button>
  );
}
