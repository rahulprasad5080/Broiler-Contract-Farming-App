import assert from "node:assert/strict";
import test from "node:test";

import {
  getNotificationsRoute,
  normalizeNotificationData,
  resolveNotificationRoute,
} from "../services/notificationRouting";

test("getNotificationsRoute returns the role notification fallback", () => {
  assert.equal(getNotificationsRoute("OWNER"), "/(owner)/notifications");
  assert.equal(getNotificationsRoute("ACCOUNTS"), "/(owner)/notifications");
  assert.equal(getNotificationsRoute("SUPERVISOR"), "/(supervisor)/notifications");
  assert.equal(getNotificationsRoute("FARMER"), "/(farmer)/notifications");
  assert.equal(getNotificationsRoute(null), "/(farmer)/notifications");
});

test("resolveNotificationRoute maps owner batch and farmer farm payloads", () => {
  assert.deepEqual(
    resolveNotificationRoute({
      role: "OWNER",
      data: { batchId: "batch-1" },
    }),
    {
      href: {
        pathname: "/(owner)/manage/batches/[id]",
        params: { id: "batch-1" },
      },
      usedFallback: false,
    },
  );

  assert.deepEqual(
    resolveNotificationRoute({
      role: "FARMER",
      data: { farmId: "farm-1" },
    }),
    {
      href: {
        pathname: "/(farmer)/farms/[id]",
        params: { id: "farm-1" },
      },
      usedFallback: false,
    },
  );
});

test("resolveNotificationRoute supports nested FCM payload data", () => {
  const nested = normalizeNotificationData({
    data: JSON.stringify({ targetType: "SALE", targetId: "sale-1" }),
  });

  assert.equal(nested.targetType, "SALE");
  assert.equal(nested.targetid, "sale-1");
  assert.deepEqual(
    resolveNotificationRoute({
      role: "SUPERVISOR",
      data: nested,
    }),
    {
      href: "/(supervisor)/tasks/sales",
      usedFallback: false,
    },
  );
});

test("resolveNotificationRoute falls back when payload has no navigation target", () => {
  assert.deepEqual(
    resolveNotificationRoute({
      role: "OWNER",
      data: { title: "General update" },
    }),
    {
      href: "/(owner)/notifications",
      usedFallback: true,
    },
  );
});
