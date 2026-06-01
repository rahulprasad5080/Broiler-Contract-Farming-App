import { z } from "zod";
import { getLocalDateValue } from "@/services/dateUtils";
import {
  API_EXPENSE_LEDGER_VALUES,
  type ApiExpenseLedger,
} from "@/services/managementApi";

export const LEDGERS = [
  API_EXPENSE_LEDGER_VALUES[1],
  API_EXPENSE_LEDGER_VALUES[0],
] as const satisfies readonly ApiExpenseLedger[];

export const catalogSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
    type: z.string().trim().min(1, "Type is required"),
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
    category: z.string().trim().min(1, "Category is required"),
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
    vendorId: z.string().optional(),
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
  type: "",
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
  category: "",
  catalogItemId: "",
  expenseDate: getLocalDateValue(),
  description: "",
  quantity: "",
  unit: "kg",
  rate: "",
  totalAmount: "",
  vendorName: "",
  vendorId: "",
  invoiceNumber: "",
  billPhotoUrl: "",
  notes: "",
} satisfies ExpenseFormData;
