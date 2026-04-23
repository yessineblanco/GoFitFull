"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Bookmark, BookmarkPlus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ADVANCED_BI_SAVED_VIEWS_MAX,
  type AdvancedBISavedView,
  type AdvancedBISavedViewRangeKey,
} from "@/lib/bi-saved-views";

interface AdvancedBISavedViewsProps {
  coachOptions: Array<{
    id: string;
    name: string;
  }>;
  currentView: {
    coachId: string | null;
    coachName: string | null;
    packId: string | null;
    packName: string | null;
    rangeKey: AdvancedBISavedViewRangeKey;
    rangeLabel: string;
  };
  initialSavedViews: AdvancedBISavedView[];
  packOptions: Array<{
    id: string;
    name: string;
  }>;
}

function buildSavedViewHref(view: AdvancedBISavedView) {
  const params = new URLSearchParams({
    range: view.rangeKey,
  });

  if (view.coachId) {
    params.set("coach", view.coachId);
  }

  if (view.packId) {
    params.set("pack", view.packId);
  }

  return `/dashboard?${params.toString()}`;
}

function getRangeLabel(rangeKey: AdvancedBISavedViewRangeKey) {
  if (rangeKey === "7d") {
    return "7D";
  }

  if (rangeKey === "90d") {
    return "90D";
  }

  return "30D";
}

export default function AdvancedBISavedViews({
  coachOptions,
  currentView,
  initialSavedViews,
  packOptions,
}: AdvancedBISavedViewsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [savedViews, setSavedViews] = useState(initialSavedViews);
  const [isPending, startTransition] = useTransition();

  const coachNameById = useMemo(
    () => new Map(coachOptions.map((option) => [option.id, option.name])),
    [coachOptions]
  );
  const packNameById = useMemo(
    () => new Map(packOptions.map((option) => [option.id, option.name])),
    [packOptions]
  );
  const resolvedSavedViews = useMemo(
    () =>
      savedViews.map((view) => ({
        ...view,
        href: buildSavedViewHref(view),
        coachName: view.coachId ? coachNameById.get(view.coachId) || "Saved coach" : null,
        packName: view.packId ? packNameById.get(view.packId) || "Saved package" : null,
        rangeLabel: getRangeLabel(view.rangeKey),
      })),
    [coachNameById, packNameById, savedViews]
  );
  const currentSummaryBadges = [
    currentView.rangeLabel,
    currentView.coachName ? `Coach: ${currentView.coachName}` : null,
    currentView.packName ? `Package: ${currentView.packName}` : null,
  ].filter((value): value is string => Boolean(value));

  const handleSave = () => {
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/bi/saved-views", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            rangeKey: currentView.rangeKey,
            coachId: currentView.coachId,
            packId: currentView.packId,
          }),
        });
        const payload = await response.json();

        if (!response.ok) {
          setMessage(payload.error || "Failed to save this BI view.");
          return;
        }

        setSavedViews(payload.savedViews || []);
        setName("");
        setMessage("Saved view added.");
      } catch (error) {
        console.error("Failed to save BI view:", error);
        setMessage("Failed to save this BI view.");
      }
    });
  };

  const handleDelete = (id: string) => {
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/bi/saved-views?id=${encodeURIComponent(id)}`,
          {
            method: "DELETE",
          }
        );
        const payload = await response.json();

        if (!response.ok) {
          setMessage(payload.error || "Failed to delete this BI view.");
          return;
        }

        setSavedViews(payload.savedViews || []);
        setMessage("Saved view removed.");
      } catch (error) {
        console.error("Failed to delete BI view:", error);
        setMessage("Failed to delete this BI view.");
      }
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        setIsOpen(nextOpen);

        if (!nextOpen) {
          setMessage(null);
          setName("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 rounded-full px-3 text-xs">
          <Bookmark className="mr-1.5 h-3.5 w-3.5" />
          Saved Views
          <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            {savedViews.length}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Advanced BI Saved Views</DialogTitle>
          <DialogDescription>
            Save the current range and truthful coach/package filters so you can
            reopen the same BI slice quickly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Current View
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {currentSummaryBadges.map((badge) => (
                <Badge key={badge} variant="outline" className="bg-background/70">
                  {badge}
                </Badge>
              ))}
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={40}
                placeholder="Name this BI view"
              />
              <Button
                type="button"
                onClick={handleSave}
                disabled={
                  isPending ||
                  name.trim().length === 0 ||
                  savedViews.length >= ADVANCED_BI_SAVED_VIEWS_MAX
                }
                className="sm:w-auto"
              >
                <BookmarkPlus className="mr-1.5 h-4 w-4" />
                Save Current
              </Button>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              {savedViews.length}/{ADVANCED_BI_SAVED_VIEWS_MAX} saved views used.
            </p>
          </div>

          {message ? (
            <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
              {message}
            </div>
          ) : null}

          <div className="space-y-2">
            {resolvedSavedViews.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                No BI views saved yet.
              </div>
            ) : (
              resolvedSavedViews.map((view) => (
                <div
                  key={view.id}
                  className="flex flex-col gap-3 rounded-lg border bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-2">
                    <div className="font-medium">{view.name}</div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-background/70">
                        {view.rangeLabel}
                      </Badge>
                      {view.coachName ? (
                        <Badge variant="outline" className="bg-background/70">
                          Coach: {view.coachName}
                        </Badge>
                      ) : null}
                      {view.packName ? (
                        <Badge variant="outline" className="bg-background/70">
                          Package: {view.packName}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={view.href} scroll={false}>
                        Apply
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(view.id)}
                      disabled={isPending}
                      aria-label={`Delete saved view ${view.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
