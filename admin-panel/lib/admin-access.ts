const PROTECTED_PAGE_PREFIXES = [
  "/activity-logs",
  "/coaches",
  "/dashboard",
  "/exercises",
  "/settings",
  "/transactions",
  "/users",
  "/workouts",
] as const;

export type AdminRouteKind = "api" | "page" | null;

export function getAdminRouteKind(pathname: string): AdminRouteKind {
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return "api";
  }

  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  return isProtectedPage ? "page" : null;
}
