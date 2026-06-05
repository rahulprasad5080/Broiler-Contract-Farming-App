import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { SearchableSelectField } from "@/components/ui/SearchableSelectField";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { useMasterDataTypeOptions } from "@/hooks/useMasterDataTypeOptions";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { createCatalogItem, updateCatalogItem } from "@/services/managementApi";

type CatalogForm = {
  type: string;
  name: string;
  sku: string;
  unit: string;
  defaultRate: string;
  manufacturer: string;
  reorderLevel: string;
  currentStock: string;
  isActive: boolean;
};

const EMPTY_FORM: CatalogForm = {
  type: "",
  name: "",
  sku: "",
  unit: "kg",
  defaultRate: "",
  manufacturer: "",
  reorderLevel: "",
  currentStock: "",
  isActive: true,
};

function toOptionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export default function CatalogCreateUpdateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    itemId?: string;
    type?: string;
    name?: string;
    sku?: string;
    unit?: string;
    defaultRate?: string;
    manufacturer?: string;
    reorderLevel?: string;
    currentStock?: string;
    isActive?: string;
  }>();
  const { accessToken } = useAuth();
  const itemId = typeof params.itemId === "string" ? params.itemId : "";
  const isEditMode = Boolean(itemId);
  const [form, setForm] = useState<CatalogForm>(() => ({
    type: typeof params.type === "string" ? params.type : EMPTY_FORM.type,
    name: typeof params.name === "string" ? params.name : EMPTY_FORM.name,
    sku: typeof params.sku === "string" ? params.sku : EMPTY_FORM.sku,
    unit: typeof params.unit === "string" ? params.unit : EMPTY_FORM.unit,
    defaultRate:
      typeof params.defaultRate === "string" ? params.defaultRate : EMPTY_FORM.defaultRate,
    manufacturer:
      typeof params.manufacturer === "string" ? params.manufacturer : EMPTY_FORM.manufacturer,
    reorderLevel:
      typeof params.reorderLevel === "string" ? params.reorderLevel : EMPTY_FORM.reorderLevel,
    currentStock:
      typeof params.currentStock === "string" ? params.currentStock : EMPTY_FORM.currentStock,
    isActive: params.isActive === "false" ? false : EMPTY_FORM.isActive,
  }));
  const [saving, setSaving] = useState(false);

  const {
    selectOptions: catalogTypeOptions,
    loading: loadingCatalogTypes,
    errorMessage: catalogTypeError,
  } = useMasterDataTypeOptions("CATALOG_ITEM_TYPE");

  useEffect(() => {
    if (form.type || !catalogTypeOptions[0]) return;
    setForm((current) => ({ ...current, type: catalogTypeOptions[0].value }));
  }, [catalogTypeOptions, form.type]);

  const updateField = (key: keyof CatalogForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!accessToken || saving) return;

    const type = form.type.trim();
    const name = form.name.trim();
    const unit = form.unit.trim();

    if (!type || !name || !unit) {
      showRequestErrorToast(new Error("Type, name and unit are required."), {
        title: "Missing details",
        fallbackMessage: "Type, name and unit are required.",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type,
        name,
        sku: form.sku.trim() || undefined,
        unit,
        defaultRate: toOptionalNumber(form.defaultRate),
        manufacturer: form.manufacturer.trim() || undefined,
        reorderLevel: toOptionalNumber(form.reorderLevel),
        currentStock: toOptionalNumber(form.currentStock),
      };

      if (isEditMode) {
        await updateCatalogItem(accessToken, itemId, {
          ...payload,
          isActive: form.isActive,
        });
      } else {
        await createCatalogItem(accessToken, payload);
      }

      showSuccessToast(
        isEditMode ? "Catalog item updated successfully." : "Catalog item created successfully.",
        isEditMode ? "Updated" : "Created",
      );
      router.back();
    } catch (error) {
      showRequestErrorToast(error, {
        title: isEditMode ? "Catalog update failed" : "Catalog save failed",
        fallbackMessage: isEditMode
          ? "Could not update catalog item."
          : "Could not create catalog item.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
        <TopAppBar
        title={isEditMode ? "Update Catalog Item" : "Add Catalog Item"}
        subtitle={isEditMode ? "Update master catalog stock item" : "Create master catalog stock item"}
        leadingMode="back"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.infoBanner}>
              <Ionicons name="cube-outline" size={18} color={Colors.primary} />
              <Text style={styles.infoText}>
                {isEditMode
                  ? "Update this catalog item across purchase, allocation, treatment, and inventory flows."
                  : "This item will be available for purchase, allocation, treatment, and inventory flows."}
              </Text>
            </View>

            <SearchableSelectField
              label="Type"
              value={form.type}
              options={catalogTypeOptions}
              onSelect={(value) => updateField("type", value)}
              placeholder={loadingCatalogTypes ? "Loading types..." : "Select type"}
              searchPlaceholder="Search catalog type"
              emptyMessage="No catalog types found"
              error={catalogTypeError || undefined}
              disabled={loadingCatalogTypes}
              required
            />

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(value) => updateField("name", value)}
              placeholder="Starter feed"
              placeholderTextColor={Colors.textSecondary}
            />

            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>SKU</Text>
                <TextInput
                  style={styles.input}
                  value={form.sku}
                  onChangeText={(value) => updateField("sku", value)}
                  placeholder="Optional"
                  placeholderTextColor={Colors.textSecondary}
                  autoCapitalize="characters"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Unit</Text>
                <TextInput
                  style={styles.input}
                  value={form.unit}
                  onChangeText={(value) => updateField("unit", value)}
                  placeholder="kg / bag / ml"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>Default Rate</Text>
                <TextInput
                  style={styles.input}
                  value={form.defaultRate}
                  onChangeText={(value) => updateField("defaultRate", value)}
                  placeholder="0"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Reorder Level</Text>
                <TextInput
                  style={styles.input}
                  value={form.reorderLevel}
                  onChangeText={(value) => updateField("reorderLevel", value)}
                  placeholder="0"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>Current Stock</Text>
                <TextInput
                  style={styles.input}
                  value={form.currentStock}
                  onChangeText={(value) => updateField("currentStock", value)}
                  placeholder="0"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Manufacturer</Text>
                <TextInput
                  style={styles.input}
                  value={form.manufacturer}
                  onChangeText={(value) => updateField("manufacturer", value)}
                  placeholder="Optional"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>

            {isEditMode ? (
              <View style={styles.activeCard}>
                <View style={styles.activeIcon}>
                  <Ionicons name="power-outline" size={20} color={Colors.primary} />
                </View>
                <View style={styles.activeCopy}>
                  <Text style={styles.activeTitle}>Active item</Text>
                  <Text style={styles.activeSubtitle}>
                    Inactive items stay hidden from active dropdown flows.
                  </Text>
                </View>
                <Switch
                  value={form.isActive}
                  onValueChange={(value) => setForm((current) => ({ ...current, isActive: value }))}
                  trackColor={{ false: "#E5E7EB", true: "#B7E0C2" }}
                  thumbColor={form.isActive ? Colors.primary : "#9CA3AF"}
                />
              </View>
            ) : null}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={saving}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={() => void handleSubmit()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveText}>{isEditMode ? "Update Item" : "Save Item"}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: "#F4F6F8",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDEFE3",
    backgroundColor: "#F0FDF4",
    marginBottom: 8,
  },
  infoText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  activeCard: {
    minHeight: 70,
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDEFE3",
    backgroundColor: "#F8FAF9",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  activeIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF8F0",
  },
  activeCopy: {
    flex: 1,
  },
  activeTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  activeSubtitle: {
    marginTop: 3,
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
  },
  label: {
    marginTop: 14,
    marginBottom: 7,
    color: Colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 13,
    color: Colors.text,
    fontSize: 14,
  },
  row: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    gap: 10,
  },
  field: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: "800",
  },
  saveButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.7,
  },
});
