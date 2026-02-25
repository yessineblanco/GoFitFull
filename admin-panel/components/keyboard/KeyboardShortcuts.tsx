"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Keyboard } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  {
    keys: ["⌘", "K"],
    description: "Open global search",
    category: "Navigation",
  },
  {
    keys: ["⌘", "/"],
    description: "Show keyboard shortcuts",
    category: "Navigation",
  },
  {
    keys: ["G", "D"],
    description: "Go to Dashboard",
    category: "Navigation",
  },
  {
    keys: ["G", "U"],
    description: "Go to Users",
    category: "Navigation",
  },
  {
    keys: ["G", "E"],
    description: "Go to Exercises",
    category: "Navigation",
  },
  {
    keys: ["G", "W"],
    description: "Go to Workouts",
    category: "Navigation",
  },
  {
    keys: ["G", "A"],
    description: "Go to Activity Logs",
    category: "Navigation",
  },
  {
    keys: ["G", "S"],
    description: "Go to Settings",
    category: "Navigation",
  },
  {
    keys: ["⌘", "K"],
    description: "Quick search",
    category: "Actions",
  },
  {
    keys: ["N"],
    description: "New item (context-aware)",
    category: "Actions",
  },
  {
    keys: ["/"],
    description: "Focus search input",
    category: "Actions",
  },
  {
    keys: ["Esc"],
    description: "Close dialog/modal",
    category: "Actions",
  },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="glass hover:bg-white/10 transition-all duration-200"
          title="Keyboard Shortcuts (⌘/)"
        >
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[60vh]">
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <Kbd key={i}>{key}</Kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
