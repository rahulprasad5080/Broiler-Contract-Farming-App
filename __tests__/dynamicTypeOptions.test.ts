import assert from "node:assert/strict";
import test from "node:test";

import {
  FALLBACK_TYPE_OPTION_VALUES,
  getFallbackTypeOptions,
  normalizeTypeOptionDropdown,
} from "../services/management/typeOptionUtils";

test("dynamic type option dropdown normalizes backend response variants", () => {
  const normalized = normalizeTypeOptionDropdown("PURCHASE_TYPE", {
    data: [
      { id: "opt-1", value: "FEED", description: "Feed purchase" },
      { id: "opt-2", label: "Custom Expense", isActive: false },
      "CHICKS",
      { id: "bad" },
    ],
  });

  assert.deepEqual(
    normalized.map((option) => option.value),
    ["FEED", "Custom Expense", "CHICKS"],
  );
  assert.equal(normalized[0].label, "Feed");
  assert.equal(normalized[1].isActive, false);
});

test("dynamic type masters expose seeded values only as fallback references", () => {
  assert.deepEqual(Object.keys(FALLBACK_TYPE_OPTION_VALUES).sort(), [
    "CATALOG_ITEM_TYPE",
    "EXPENSE_CATEGORY",
    "PURCHASE_TYPE",
    "TREATMENT_KIND",
  ]);

  const fallback = getFallbackTypeOptions("TREATMENT_KIND");
  assert.deepEqual(
    fallback.map((option) => option.value),
    ["OTHER", "VACCINATION", "MEDICATION"],
  );
});
