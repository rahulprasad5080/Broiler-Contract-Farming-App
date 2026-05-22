import assert from "node:assert/strict";
import test from "node:test";

import { buildFinancePurchasePayload } from "../services/entryPayloads";

test("purchase payload uses vendorId and dynamic purchase type", () => {
  const payload = buildFinancePurchasePayload({
    purchaseDate: "2026-05-22",
    purchaseType: "CUSTOM_FEED_BLEND",
    vendor: {
      id: "vendor-1",
      organizationId: "org-1",
      name: "Mahadev Feeds",
      createdAt: "2026-05-22T00:00:00.000Z",
      updatedAt: "2026-05-22T00:00:00.000Z",
    },
    catalogItem: {
      id: "item-1",
      organizationId: "org-1",
      name: "Starter Feed",
      type: "FEED",
      unit: "kg",
      isActive: true,
      createdAt: "2026-05-22T00:00:00.000Z",
      updatedAt: "2026-05-22T00:00:00.000Z",
    },
    quantity: "1,250",
    ratePerUnit: "38.5",
    paymentStatus: "PENDING",
    clientReferenceId: "purchase-test",
  });

  assert.equal(payload.vendorId, "vendor-1");
  assert.equal(payload.vendorName, "Mahadev Feeds");
  assert.equal(payload.purchaseType, "CUSTOM_FEED_BLEND");
  assert.equal(payload.catalogItemId, "item-1");
  assert.equal(payload.itemName, "Starter Feed");
  assert.equal(payload.quantity, 1250);
  assert.equal(payload.unitCost, 38.5);
  assert.equal(payload.totalAmount, 48125);
});
