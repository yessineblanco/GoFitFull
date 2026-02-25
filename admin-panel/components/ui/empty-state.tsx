import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center",
        "glass-subtle",
        className
      )}
    >
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mt-6 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">{description}</p>
      {action && (
        <Link href={action.href} className="mt-6">
          <Button>{action.label}</Button>
        </Link>
      )}
    </div>
  );
}

interface EmptySearchStateProps {
  searchQuery?: string;
  onClear?: () => void;
}

export function EmptySearchState({ searchQuery, onClear }: EmptySearchStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <svg
          className="h-8 w-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-semibold">No results found</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {searchQuery ? (
          <>
            No results found for <span className="font-medium">"{searchQuery}"</span>.
            <br />
            Try adjusting your search or filters.
          </>
        ) : (
          "No results match your current filters. Try adjusting your criteria."
        )}
      </p>
      {onClear && (
        <Button variant="outline" onClick={onClear} className="mt-4">
          Clear filters
        </Button>
      )}
    </div>
  );
}
