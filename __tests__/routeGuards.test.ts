import assert from "node:assert/strict";
import test from "node:test";

import {
  getDashboardRoute,
  getRoleRouteGroup,
  isRouteAllowedForRole,
} from "../services/routeGuards";

test("getRoleRouteGroup maps roles to route groups", () => {
  assert.equal(getRoleRouteGroup("OWNER"), "(owner)");
  assert.equal(getRoleRouteGroup("SUPERVISOR"), "(supervisor)");
  assert.equal(getRoleRouteGroup("FARMER"), "(farmer)");
});

test("isRouteAllowedForRole allows a user's own route group", () => {
  assert.equal(isRouteAllowedForRole("OWNER", ["(owner)", "dashboard"]), true);
  assert.equal(isRouteAllowedForRole("SUPERVISOR", ["(supervisor)", "review"]), true);
  assert.equal(isRouteAllowedForRole("FARMER", ["(farmer)", "tasks"]), true);
});

test("isRouteAllowedForRole rejects cross-role route groups", () => {
  assert.equal(isRouteAllowedForRole("FARMER", ["(owner)", "dashboard"]), false);
  assert.equal(isRouteAllowedForRole("OWNER", ["(farmer)", "farms"]), false);
  assert.equal(isRouteAllowedForRole("SUPERVISOR", ["(farmer)", "tasks"]), false);
});

test("isRouteAllowedForRole allows auth setup and unprotected routes", () => {
  assert.equal(isRouteAllowedForRole("OWNER", ["(auth)", "set-pin"]), true);
  assert.equal(isRouteAllowedForRole("FARMER", ["(auth)", "quick-unlock"]), true);
  assert.equal(isRouteAllowedForRole("SUPERVISOR", ["index"]), true);
});

test("getDashboardRoute returns the role dashboard fallback", () => {
  assert.equal(getDashboardRoute("OWNER"), "/(owner)/dashboard");
  assert.equal(getDashboardRoute("SUPERVISOR"), "/(supervisor)/dashboard");
  assert.equal(getDashboardRoute("FARMER"), "/(farmer)/dashboard");
  assert.equal(getDashboardRoute(null), "/(farmer)/dashboard");
});
