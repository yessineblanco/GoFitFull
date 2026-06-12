import assert from "node:assert/strict";
import test from "node:test";
import { getAdminRouteKind } from "./admin-access.ts";

test("all admin API routes require admin access", () => {
  assert.equal(getAdminRouteKind("/api"), "api");
  assert.equal(getAdminRouteKind("/api/users/123"), "api");
  assert.equal(getAdminRouteKind("/api/upload"), "api");
});

test("every admin page section requires admin access", () => {
  const protectedPages = [
    "/activity-logs",
    "/coaches/123",
    "/dashboard",
    "/exercises/new",
    "/settings",
    "/transactions",
    "/users/123",
    "/workouts/new",
  ];

  for (const pathname of protectedPages) {
    assert.equal(getAdminRouteKind(pathname), "page", pathname);
  }
});

test("public and lookalike paths remain outside the admin gate", () => {
  assert.equal(getAdminRouteKind("/"), null);
  assert.equal(getAdminRouteKind("/login"), null);
  assert.equal(getAdminRouteKind("/users-public"), null);
});
