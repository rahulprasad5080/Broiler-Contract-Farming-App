import { useCallback, useEffect, useMemo, useState } from "react";

import type { SearchableSelectOption } from "@/components/ui/SearchableSelectField";
import { useAuth } from "@/context/AuthContext";
import {
  getFallbackTypeOptions,
  labelizeTypeOption,
  listMasterDataTypeOptionDropdown,
  type ApiMasterDataTypeOption,
  type MasterDataTypeCategory,
} from "@/services/managementApi";

type UseMasterDataTypeOptionsConfig = {
  enabled?: boolean;
  includeInactive?: boolean;
  limit?: number;
  search?: string;
  useFallbackOnError?: boolean;
};

export function useMasterDataTypeOptions(
  category: MasterDataTypeCategory,
  {
    enabled = true,
    includeInactive = false,
    limit = 100,
    search,
    useFallbackOnError = true,
  }: UseMasterDataTypeOptionsConfig = {},
) {
  const { accessToken } = useAuth();
  const [options, setOptions] = useState<ApiMasterDataTypeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    if (!accessToken || !enabled) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await listMasterDataTypeOptionDropdown(accessToken, {
        category,
        includeInactive,
        limit,
        search,
      });
      setOptions(response.filter((option) => includeInactive || option.isActive !== false));
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Unable to load dropdown options.";
      setErrorMessage(message);
      setOptions(useFallbackOnError ? getFallbackTypeOptions(category) : []);
    } finally {
      setLoading(false);
    }
  }, [accessToken, category, enabled, includeInactive, limit, search, useFallbackOnError]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const selectOptions = useMemo<SearchableSelectOption[]>(
    () =>
      options.map((option) => ({
        label: option.label || labelizeTypeOption(option.value),
        value: option.value,
        description: option.description ?? undefined,
        keywords: [option.value, option.description].filter(Boolean).join(" "),
      })),
    [options],
  );

  return {
    options,
    selectOptions,
    loading,
    errorMessage,
    reload: loadOptions,
  };
}
