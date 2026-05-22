import type {
  ApiPaymentDirection,
  ApiPaymentEntryType,
} from "./managementApi";

export type PaymentPartnerKind = "vendor" | "trader" | "freeText";

export function getPaymentPartnerKind(paymentType: ApiPaymentEntryType): PaymentPartnerKind {
  if (paymentType === "PURCHASE" || paymentType === "EXPENSE") {
    return "vendor";
  }

  if (paymentType === "SALE_RECEIPT") {
    return "trader";
  }

  return "freeText";
}

export function getDirectionForPaymentType(
  paymentType: ApiPaymentEntryType,
  currentDirection: ApiPaymentDirection,
): ApiPaymentDirection {
  const partnerKind = getPaymentPartnerKind(paymentType);

  if (partnerKind === "vendor") {
    return "OUTBOUND";
  }

  if (partnerKind === "trader") {
    return "INBOUND";
  }

  return currentDirection;
}
