import assert from "node:assert/strict";
import test from "node:test";

import { getLocalDateValue } from "../services/dateUtils";

test("getLocalDateValue formats the local calendar date", () => {
  assert.equal(getLocalDateValue(new Date(2026, 4, 9, 14, 30)), "2026-05-09");
});

test("getLocalDateValue does not use the UTC date during India early morning", () => {
  const earlyMorningLocal = {
    getFullYear: () => 2026,
    getMonth: () => 4,
    getDate: () => 9,
    toISOString: () => "2026-05-08T18:45:00.000Z",
  } as Date;

  assert.equal(getLocalDateValue(earlyMorningLocal), "2026-05-09");
  assert.notEqual(
    getLocalDateValue(earlyMorningLocal),
    earlyMorningLocal.toISOString().slice(0, 10),
  );
});
