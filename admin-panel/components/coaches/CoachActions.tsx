"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Coach {
  id: string;
  user_id: string;
  display_name: string;
  status: string;
  cv_url: string | null;
  certifications_count: number;
}

interface CoachActionsProps {
  coach: Coach;
}

export function CoachActions({ coach }: CoachActionsProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const updateStatus = async (newStatus: "approved" | "rejected") => {
    setLoading(true);
    try {
      const res = await fetch("/api/coaches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachProfileId: coach.id, status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      toast.success(
        `Coach ${coach.display_name} has been ${newStatus}.`
      );
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update coach status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      {coach.cv_url && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          asChild
        >
          <a href={coach.cv_url} target="_blank" rel="noopener noreferrer" title="View CV">
            <FileText className="h-4 w-4" />
          </a>
        </Button>
      )}

      {coach.status === "pending" && (
        <>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                disabled={loading}
                title="Approve"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve Coach</AlertDialogTitle>
                <AlertDialogDescription>
                  Approve <strong>{coach.display_name}</strong> as a coach?
                  They will be visible in the marketplace and can start accepting bookings.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => updateStatus("approved")}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                disabled={loading}
                title="Reject"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reject Coach</AlertDialogTitle>
                <AlertDialogDescription>
                  Reject <strong>{coach.display_name}</strong>&apos;s coach application?
                  They will not appear in the marketplace.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => updateStatus("rejected")}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Reject
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {coach.status === "approved" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-red-500 hover:text-red-400"
              disabled={loading}
            >
              Revoke
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke Coach Status</AlertDialogTitle>
              <AlertDialogDescription>
                Revoke <strong>{coach.display_name}</strong>&apos;s coach status?
                They will be removed from the marketplace.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => updateStatus("rejected")}
                className="bg-red-600 hover:bg-red-700"
              >
                Revoke
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {coach.status === "rejected" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-green-500 hover:text-green-400"
              disabled={loading}
            >
              Re-approve
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Re-approve Coach</AlertDialogTitle>
              <AlertDialogDescription>
                Re-approve <strong>{coach.display_name}</strong> as a coach?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => updateStatus("approved")}
                className="bg-green-600 hover:bg-green-700"
              >
                Re-approve
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
