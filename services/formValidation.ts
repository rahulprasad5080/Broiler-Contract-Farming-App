import { z } from "zod";

export function parseFormNumber(value?: string | null) {
  const normalized = String(value ?? "").replace(/,/g, "").trim();
  if (!normalized) return undefined;

  const next = Number(normalized);
  return Number.isNaN(next) ? undefined : next;
}

const numericField = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine((value) => parseFormNumber(value) !== undefined, {
      message: `${label} must be a number`,
    });

const optionalNumericField = (label: string) =>
  z
    .string()
    .optional()
    .refine((value) => !value || parseFormNumber(value) !== undefined, {
      message: `${label} must be a number`,
    });

export const dailyEntryValidationSchema = z.object({
  batchId: z.string().min(1, "Please select a batch"),
  logDate: z.string().min(1, "Date is required"),
  openingBirdCount: optionalNumericField("Opening bird count"),
  mortalityCount: optionalNumericField("Mortality"),
  cullCount: optionalNumericField("Cull"),
  feedConsumedKg: optionalNumericField("Feed consumed"),
  waterConsumedLtr: optionalNumericField("Water consumed"),
  avgWeightGrams: optionalNumericField("Average weight"),
  notes: z.string().optional(),
});

export const expenseEntryValidationSchema = z.object({
  batchId: z.string().min(1, "Please select a batch"),
  ledger: z.enum(["COMPANY", "FARMER"]),
  category: z.string().min(1, "Select category"),
  totalAmount: numericField("Amount"),
  expenseDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  paymentType: z.string(),
});

export const salesEntryValidationSchema = z.object({
  batchId: z.string().min(1, "Please select a batch"),
  traderId: z.string().min(1, "Please select a customer"),
  saleDate: z.string().min(1, "Date is required"),
  birdCount: numericField("Quantity sold"),
  averageWeightKg: numericField("Average weight"),
  ratePerKg: numericField("Rate"),
  rateType: z.enum(["LIVE", "DRESSED"]),
  notes: z.string().optional(),
});

export const treatmentEntryValidationSchema = z.object({
  batchId: z.string().min(1, "Please select a batch"),
  dailyLogId: z.string().optional(),
  treatmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  kind: z.enum(["MEDICATION", "VACCINATION", "OTHER"]),
  catalogItemId: z.string().optional(),
  treatmentName: z.string().optional(),
  dosage: z.string().optional(),
  birdCount: z.string().optional().refine((value) => !value || parseFormNumber(value) !== undefined, {
    message: "Bird count must be a number",
  }),
  notes: z.string().optional(),
});
