import {
  API_CATALOG_ITEM_TYPE_VALUES,
  API_EXPENSE_CATEGORY_CODE_VALUES,
  API_PURCHASE_TYPE_VALUES,
  API_TREATMENT_KIND_VALUES,
} from "../apiEnums";
import type { ApiMasterDataTypeOption, MasterDataTypeCategory } from "./types";

export const FALLBACK_TYPE_OPTION_VALUES: Record<MasterDataTypeCategory, readonly string[]> = {
  CATALOG_ITEM_TYPE: API_CATALOG_ITEM_TYPE_VALUES,
  PURCHASE_TYPE: API_PURCHASE_TYPE_VALUES,
  EXPENSE_CATEGORY: API_EXPENSE_CATEGORY_CODE_VALUES,
  TREATMENT_KIND: API_TREATMENT_KIND_VALUES,
};

export function labelizeTypeOption(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getDropdownRows(response: unknown): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (response && typeof response === "object") {
    const record = response as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      return record.data;
    }
    if (Array.isArray(record.options)) {
      return record.options;
    }
  }

  return [];
}

export function normalizeTypeOptionDropdown(
  category: MasterDataTypeCategory,
  response: unknown,
): ApiMasterDataTypeOption[] {
  const rows = getDropdownRows(response);

  return rows
    .map((row): ApiMasterDataTypeOption | null => {
      if (typeof row === "string") {
        const value = row.trim();
        if (!value) return null;
        return {
          id: value,
          category,
          value,
          label: labelizeTypeOption(value),
          isActive: true,
        };
      }

      if (!row || typeof row !== "object") {
        return null;
      }

      const record = row as Record<string, unknown>;
      const rawValue =
        record.value ?? record.code ?? record.name ?? record.label;
      const value = typeof rawValue === "string" ? rawValue.trim() : "";

      if (!value) {
        return null;
      }

      return {
        id:
          typeof record.id === "string" && record.id.trim()
            ? record.id
            : value,
        organizationId:
          typeof record.organizationId === "string" ? record.organizationId : null,
        category:
          typeof record.category === "string" && record.category.trim()
            ? record.category
            : category,
        value,
        label:
          typeof record.label === "string" && record.label.trim()
            ? record.label
            : labelizeTypeOption(value),
        description:
          typeof record.description === "string" ? record.description : null,
        isSystem:
          typeof record.isSystem === "boolean" ? record.isSystem : null,
        isActive:
          typeof record.isActive === "boolean" ? record.isActive : true,
        createdAt:
          typeof record.createdAt === "string" ? record.createdAt : null,
        updatedAt:
          typeof record.updatedAt === "string" ? record.updatedAt : null,
      };
    })
    .filter((option): option is ApiMasterDataTypeOption => Boolean(option));
}

export function getFallbackTypeOptions(category: MasterDataTypeCategory) {
  return FALLBACK_TYPE_OPTION_VALUES[category].map((value) => ({
    id: value,
    category,
    value,
    label: labelizeTypeOption(value),
    isActive: true,
  })) satisfies ApiMasterDataTypeOption[];
}
