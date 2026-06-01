import type { Href } from "expo-router";

import type { AppRole } from "./routeGuards";

type NotificationRouteInput = {
  role: AppRole;
  data?: Record<string, unknown> | null;
};

type NotificationRouteResult = {
  href: Href;
  usedFallback: boolean;
};

const ROLE_GROUPS = {
  OWNER: "(owner)",
  ACCOUNTS: "(owner)",
  SUPERVISOR: "(supervisor)",
  FARMER: "(farmer)",
} as const;

function roleGroup(role: AppRole) {
  if (role === "OWNER" || role === "ACCOUNTS" || role === "SUPERVISOR" || role === "FARMER") {
    return ROLE_GROUPS[role];
  }

  return ROLE_GROUPS.FARMER;
}

export function getNotificationsRoute(role: AppRole): Href {
  const group = roleGroup(role);
  return `/${group}/notifications` as Href;
}

function normalizeScalar(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed && trimmed !== "null" && trimmed !== "undefined" ? trimmed : undefined;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
}

function tryParseObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function normalizeNotificationData(input?: Record<string, unknown> | null) {
  const normalized: Record<string, unknown> = {};
  const stack = [input].filter(Boolean) as Record<string, unknown>[];

  while (stack.length > 0) {
    const current = stack.shift();
    if (!current) continue;

    Object.entries(current).forEach(([key, value]) => {
      if (normalized[key] === undefined) {
        normalized[key] = value;
      }

      const lowerKey = key.toLowerCase();
      if (normalized[lowerKey] === undefined) {
        normalized[lowerKey] = value;
      }

      if (["data", "payload", "notification"].includes(lowerKey)) {
        const parsed = tryParseObject(value);
        if (parsed) stack.push(parsed);
      }
    });
  }

  return normalized;
}

function pickString(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = normalizeScalar(data[key] ?? data[key.toLowerCase()]);
    if (value) return value;
  }

  return undefined;
}

function normalizeExplicitHref(value: string, role: AppRole): Href | null {
  let path = value.trim();

  if (!path) return null;

  path = path.replace(/^[a-z][a-z0-9+.-]*:\/\/\/?/i, "/");
  path = path.replace(/^https?:\/\/[^/]+/i, "");

  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  if (path.startsWith("/(owner)") || path.startsWith("/(supervisor)") || path.startsWith("/(farmer)") || path.startsWith("/(auth)")) {
    return path as Href;
  }

  const group = roleGroup(role);
  const simpleRoute = path.split("?")[0].replace(/\/+$/, "");

  if (simpleRoute === "/notifications") return `/${group}/notifications` as Href;
  if (simpleRoute === "/dashboard") return `/${group}/dashboard` as Href;
  if (simpleRoute === "/reports") return `/${group}/reports` as Href;
  if (simpleRoute.startsWith("/manage/") && group === "(owner)") {
    return `/${group}${path}` as Href;
  }
  if (simpleRoute.startsWith("/tasks/") && (group === "(farmer)" || group === "(supervisor)")) {
    return `/${group}${path}` as Href;
  }
  if (simpleRoute.startsWith("/farms/") && group === "(farmer)") {
    return `/${group}${path}` as Href;
  }

  return null;
}

function routeForTarget(role: AppRole, targetType?: string, targetId?: string): Href | null {
  if (!targetType || !targetId) return null;

  const type = targetType.toUpperCase();
  const isOwner = role === "OWNER" || role === "ACCOUNTS";
  const isSupervisor = role === "SUPERVISOR";
  const isFarmer = role === "FARMER";

  if (type === "BATCH") {
    if (isOwner) {
      return {
        pathname: "/(owner)/manage/batches/[id]",
        params: { id: targetId },
      } as Href;
    }

    if (isSupervisor) {
      return {
        pathname: "/(supervisor)/review/[batchId]",
        params: { batchId: targetId },
      } as Href;
    }
  }

  if (type === "FARM") {
    if (isOwner) {
      return {
        pathname: "/(owner)/manage/farms/[id]",
        params: { id: targetId },
      } as Href;
    }

    if (isFarmer) {
      return {
        pathname: "/(farmer)/farms/[id]",
        params: { id: targetId },
      } as Href;
    }
  }

  if (type === "DAILY_LOG") {
    if (isOwner) return "/(owner)/manage/daily-entry" as Href;
    if (isSupervisor) return "/(supervisor)/tasks/daily" as Href;
    if (isFarmer) return "/(farmer)/tasks/daily" as Href;
  }

  if (type === "SALE") {
    if (isOwner) return "/(owner)/manage/sales" as Href;
    if (isSupervisor) return "/(supervisor)/tasks/sales" as Href;
    if (isFarmer) return "/(farmer)/tasks/sales" as Href;
  }

  if (type === "COST") {
    if (isOwner) return "/(owner)/manage/expenses" as Href;
    if (isSupervisor) return "/(supervisor)/tasks/expenses" as Href;
    if (isFarmer) return "/(farmer)/tasks/expenses" as Href;
  }

  if (type === "PURCHASE" && isOwner) return "/(owner)/manage/purchase" as Href;
  if (type === "PAYMENT" && isOwner) return "/(owner)/manage/payments" as Href;
  if (type === "SETTLEMENT" && isOwner) return "/(owner)/manage/settlement" as Href;
  if (type === "TREATMENT") {
    if (isSupervisor) return "/(supervisor)/tasks/treatments" as Href;
    if (isFarmer) return "/(farmer)/tasks/treatments" as Href;
  }

  return null;
}

export function resolveNotificationRoute({
  role,
  data,
}: NotificationRouteInput): NotificationRouteResult {
  const normalized = normalizeNotificationData(data);
  const explicitRoute = pickString(normalized, [
    "href",
    "route",
    "url",
    "link",
    "deepLink",
    "deeplink",
    "pathname",
    "screen",
  ]);
  const href = explicitRoute ? normalizeExplicitHref(explicitRoute, role) : null;

  if (href) {
    return { href, usedFallback: false };
  }

  const batchId = pickString(normalized, ["batchId", "batch_id", "batch"]);
  const farmId = pickString(normalized, ["farmId", "farm_id", "farm"]);
  const targetType = pickString(normalized, ["targetType", "target_type", "type"]);
  const targetId = pickString(normalized, ["targetId", "target_id", "id"]);
  const isOwner = role === "OWNER" || role === "ACCOUNTS";
  const isSupervisor = role === "SUPERVISOR";
  const isFarmer = role === "FARMER";

  if (batchId) {
    if (isOwner) {
      return {
        href: {
          pathname: "/(owner)/manage/batches/[id]",
          params: { id: batchId },
        } as Href,
        usedFallback: false,
      };
    }

    if (isSupervisor) {
      return {
        href: {
          pathname: "/(supervisor)/review/[batchId]",
          params: { batchId },
        } as Href,
        usedFallback: false,
      };
    }
  }

  if (farmId) {
    if (isOwner) {
      return {
        href: {
          pathname: "/(owner)/manage/farms/[id]",
          params: { id: farmId },
        } as Href,
        usedFallback: false,
      };
    }

    if (isFarmer) {
      return {
        href: {
          pathname: "/(farmer)/farms/[id]",
          params: { id: farmId },
        } as Href,
        usedFallback: false,
      };
    }
  }

  const targetRoute = routeForTarget(role, targetType, targetId);
  if (targetRoute) {
    return { href: targetRoute, usedFallback: false };
  }

  return { href: getNotificationsRoute(role), usedFallback: true };
}
