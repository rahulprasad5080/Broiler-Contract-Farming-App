import type {
  ApiCatalogItem,
  ApiTransactionPaymentStatus,
  ApiVendor,
  CreateFinancePurchaseRequest,
} from "./managementApi";

export function parseEntryNumber(value?: string | null) {
  const normalized = String(value ?? "").replace(/,/g, "").trim();
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export type BuildFinancePurchasePayloadInput = {
  purchaseDate: string;
  purchaseType: string;
  vendor: ApiVendor;
  catalogItem?: ApiCatalogItem | null;
  catalogItemId?: string;
  itemName?: string;
  quantity?: string;
  ratePerUnit?: string;
  unit?: string;
  invoiceNumber?: string;
  paymentStatus?: ApiTransactionPaymentStatus;
  attachmentUrl?: string;
  remarks?: string;
  clientReferenceId?: string;
};

export function buildFinancePurchasePayload({
  purchaseDate,
  purchaseType,
  vendor,
  catalogItem,
  catalogItemId,
  itemName,
  quantity,
  ratePerUnit,
  unit,
  invoiceNumber,
  paymentStatus,
  attachmentUrl,
  remarks,
  clientReferenceId,
}: BuildFinancePurchasePayloadInput): CreateFinancePurchaseRequest {
  const parsedQuantity = parseEntryNumber(quantity);
  const unitCost = parseEntryNumber(ratePerUnit);
  const totalAmount = Number(parsedQuantity ?? 0) * Number(unitCost ?? 0);

  return {
    purchaseDate,
    purchaseType,
    vendorId: vendor.id,
    vendorName: vendor.name,
    catalogItemId: catalogItemId || catalogItem?.id || undefined,
    itemName: itemName?.trim() || catalogItem?.name || purchaseType,
    quantity: parsedQuantity,
    unit: unit?.trim() || catalogItem?.unit || undefined,
    unitCost,
    totalAmount,
    invoiceNumber: invoiceNumber?.trim() || undefined,
    paymentStatus,
    attachmentUrl: attachmentUrl?.trim() || undefined,
    remarks: remarks?.trim() || undefined,
    clientReferenceId,
  };
}
