import { z } from "zod";
import { getLocalDateValue } from "@/services/dateUtils";
import {
  type ApiCatalogItemType,
  type ApiExpenseCategoryCode,
  type ApiExpenseLedger,
} from "@/services/managementApi";

export const CATALOG_TYPES = [
  "CHICKS",
  "FEED",
  "MEDICINE",
  "VACCINE",
  "EQUIPMENT",
  "OTHER",
] as const satisfies readonly ApiCatalogItemType[];

export const EXPENSE_CATEGORIES = [
  "CHICKS",
  "FEED",
  "MEDICINE",
  "VACCINE",
  "TRANSPORT",
  "OFFICE_EXPENSE",
  "SUPERVISOR_EXPENSE",
  "LABOUR",
  "ELECTRICITY",
  "COCO_PITH",
  "WATER",
  "DIESEL",
  "SHED_MAINTENANCE",
  "REPAIRS",
  "MISCELLANEOUS",
  "OTHER_COMPANY",
  "OTHER_FARMER",
] as const satisfies readonly ApiExpenseCategoryCode[];

export const LEDGERS = ["COMPANY", "FARMER"] as const satisfies readonly ApiExpenseLedger[];

export const catalogSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(CATALOG_TYPES),
  sku: z.string().optional(),
  unit: z.string().trim().min(1, "Unit is required"),
  defaultRate: z.string().optional().refine((value) => !value || !Number.isNaN(Number(value)), {
    message: "Must be a number",
  }),
  reorderLevel: z.string().optional().refine((value) => !value || !Number.isNaN(Number(value)), {
    message: "Must be a number",
  }),
  currentStock: z.string().optional().refine((value) => !value || !Number.isNaN(Number(value)), {
    message: "Must be a number",
  }),
  manufacturer: z.string().optional(),
});

export const expenseSchema = z
  .object({
    batchId: z.string().trim().min(1, "Batch ID is required"),
    ledger: z.enum(LEDGERS),
    category: z.enum(EXPENSE_CATEGORIES),
    catalogItemId: z.string().optional(),
    expenseDate: z.string().trim().min(1, "Expense date is required"),
    description: z.string().optional(),
    quantity: z.string().optional().refine((value) => !value || !Number.isNaN(Number(value)), {
      message: "Must be a number",
    }),
    unit: z.string().optional(),
    rate: z.string().optional().refine((value) => !value || !Number.isNaN(Number(value)), {
      message: "Must be a number",
    }),
    totalAmount: z.string().optional().refine((value) => !value || !Number.isNaN(Number(value)), {
      message: "Must be a number",
    }),
    vendorName: z.string().optional(),
    invoiceNumber: z.string().optional(),
    billPhotoUrl: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const hasTotal = Boolean(value.totalAmount?.trim());
    const canCompute = Boolean(value.quantity?.trim() && value.rate?.trim());

    if (!hasTotal && !canCompute) {
      ctx.addIssue({
        code: "custom",
        message: "Enter total amount or quantity with rate",
        path: ["totalAmount"],
      });
    }
  });

export type CatalogFormData = z.infer<typeof catalogSchema>;
export type ExpenseFormData = z.infer<typeof expenseSchema>;

export const CATALOG_DEFAULTS = {
  name: "",
  type: "FEED",
  sku: "",
  unit: "kg",
  defaultRate: "",
  reorderLevel: "",
  currentStock: "",
  manufacturer: "",
} satisfies CatalogFormData;

export const EXPENSE_DEFAULTS = {
  batchId: "",
  ledger: "COMPANY",
  category: "FEED",
  catalogItemId: "",
  expenseDate: getLocalDateValue(),
  description: "",
  quantity: "",
  unit: "kg",
  rate: "",
  totalAmount: "",
  vendorName: "",
  invoiceNumber: "",
  billPhotoUrl: "",
  notes: "",
} satisfies ExpenseFormData;
