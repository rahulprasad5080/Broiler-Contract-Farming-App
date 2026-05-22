import assert from "node:assert/strict";
import test from "node:test";

import {
  getDirectionForPaymentType,
  getPaymentPartnerKind,
} from "../services/paymentPartnerRules";

test("payment partner rules enforce vendor and trader alignment", () => {
  assert.equal(getPaymentPartnerKind("PURCHASE"), "vendor");
  assert.equal(getPaymentPartnerKind("EXPENSE"), "vendor");
  assert.equal(getPaymentPartnerKind("SALE_RECEIPT"), "trader");
  assert.equal(getPaymentPartnerKind("SETTLEMENT"), "freeText");
  assert.equal(getPaymentPartnerKind("OTHER"), "freeText");
});

test("payment partner rules force documented directions", () => {
  assert.equal(getDirectionForPaymentType("PURCHASE", "INBOUND"), "OUTBOUND");
  assert.equal(getDirectionForPaymentType("EXPENSE", "INBOUND"), "OUTBOUND");
  assert.equal(getDirectionForPaymentType("SALE_RECEIPT", "OUTBOUND"), "INBOUND");
  assert.equal(getDirectionForPaymentType("SETTLEMENT", "OUTBOUND"), "OUTBOUND");
});
