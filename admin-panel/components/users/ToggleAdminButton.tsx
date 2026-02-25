"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Shield, ShieldOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
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

interface ToggleAdminButtonProps {
  userId: string;
  isAdmin: boolean;
  userName: string;
}

export default function ToggleAdminButton({
  userId,
  isAdmin,
  userName,
}: ToggleAdminButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/toggle-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isAdmin: !isAdmin }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update admin status");
      }

      setOpen(false);
      toast.success(
        isAdmin ? "Admin access revoked" : "Admin access granted",
        {
          description: `${userName} ${
            isAdmin ? "can no longer" : "can now"
          } access the admin panel.`,
        }
      );
      router.refresh();
    } catch (error: any) {
      console.error("Error toggling admin status:", error);
      toast.error("Failed to update admin status", {
        description: error.message || "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={isAdmin ? "outline" : "default"}>
          {isAdmin ? (
            <>
              <ShieldOff className="mr-2 h-4 w-4" />
              Revoke Admin
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Make Admin
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isAdmin ? "Revoke Admin Access" : "Grant Admin Access"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isAdmin ? (
              <>
                Are you sure you want to revoke admin access from{" "}
                <strong>{userName}</strong>? They will no longer be able to
                access the admin panel.
              </>
            ) : (
              <>
                Are you sure you want to grant admin access to{" "}
                <strong>{userName}</strong>? They will be able to access the admin
                panel and manage all data.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleToggle} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isAdmin ? "Revoking..." : "Granting..."}
              </>
            ) : (
              <>{isAdmin ? "Revoke Access" : "Grant Access"}</>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
