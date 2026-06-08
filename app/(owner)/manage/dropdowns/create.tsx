import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import {
  createMasterDataTypeOption,
  updateMasterDataTypeOption,
  type MasterDataTypeCategory,
} from "@/services/managementApi";

const CATEGORIES: { value: MasterDataTypeCategory; label: string; icon: string; activeColor: string }[] = [
  { value: "CATALOG_ITEM_TYPE", label: "Catalog Item", icon: "cube-outline", activeColor: "#00875A" }, // Emerald Green
  { value: "PURCHASE_TYPE", label: "Purchase", icon: "cart-outline", activeColor: "#0F766E" }, // Teal
  { value: "EXPENSE_CATEGORY", label: "Expense", icon: "wallet-outline", activeColor: "#B45309" }, // Amber
  { value: "TREATMENT_KIND", label: "Treatment", icon: "heart-outline", activeColor: "#BE123C" }, // Rose
];

export default function DropdownCreateScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    category?: MasterDataTypeCategory;
    optionId?: string;
    value?: string;
    description?: string;
    isActive?: string;
  }>();
  const optionId = typeof params.optionId === "string" ? params.optionId : "";
  const isEditMode = Boolean(optionId);

  // Use passed category from list page or default to CATALOG_ITEM_TYPE
  const defaultCategory =
    params.category && CATEGORIES.some((c) => c.value === params.category)
      ? params.category
      : "CATALOG_ITEM_TYPE";

  const [category, setCategory] = useState<MasterDataTypeCategory>(defaultCategory);
  const [value, setValue] = useState(typeof params.value === "string" ? params.value : "");
  const [description, setDescription] = useState(
    typeof params.description === "string" ? params.description : "",
  );
  const [isActive, setIsActive] = useState(params.isActive === "false" ? false : true);
  const [saving, setSaving] = useState(false);
  const [valueFocused, setValueFocused] = useState(false);
  const [descFocused, setDescFocused] = useState(false);

  const handleSubmit = async () => {
    if (!accessToken || !value.trim() || saving) return;

    setSaving(true);
    // Convert spaces to underscores and uppercase the value
    const formattedValue = value.trim().toUpperCase().replace(/\s+/g, "_");

    try {
      if (isEditMode) {
        await updateMasterDataTypeOption(accessToken, optionId, {
          value: formattedValue,
          description: description.trim() || undefined,
          isActive,
        });
      } else {
        await createMasterDataTypeOption(accessToken, {
          category,
          value: formattedValue,
          description: description.trim() || undefined,
          isActive,
        });
      }

      showSuccessToast(
        isEditMode
          ? `Successfully updated '${formattedValue}'.`
          : `Successfully added '${formattedValue}' to dropdown list.`,
        isEditMode ? "Updated" : "Created"
      );
      router.back();
    } catch (error) {
      showRequestErrorToast(error, {
        title: isEditMode ? "Failed to update option" : "Failed to create option",
        fallbackMessage: isEditMode
          ? "Could not update dropdown option."
          : "Could not add new dropdown option.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <View style={styles.pageContent}>
        <TopAppBar
          title={isEditMode ? "Edit Option" : "Add Option"}
          subtitle={isEditMode ? "Update custom dropdown entry" : "Create new custom dropdown entry"}
          leadingMode="back"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <View style={styles.infoBanner}>
                <Ionicons name="sparkles" size={16} color={Colors.primary} />
                <Text style={styles.infoBannerText}>
                  {isEditMode
                    ? "Update this custom option value and status across dropdown choices."
                    : "Add custom option values to structure dropdown choices across the app."}
                </Text>
              </View>

              <Text style={styles.label}>Dropdown Category</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((cat) => {
                  const active = cat.value === category;
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.chip,
                        active && {
                          backgroundColor: cat.activeColor,
                          borderColor: cat.activeColor,
                        },
                      ]}
                      onPress={() => {
                        if (!isEditMode) {
                          setCategory(cat.value);
                        }
                      }}
                      disabled={isEditMode}
                    >
                      <Ionicons
                        name={cat.icon as any}
                        size={16}
                        color={active ? "#FFF" : Colors.textSecondary}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Option Value</Text>
              <View style={[styles.inputBox, valueFocused && styles.inputBoxActive]}>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={setValue}
                  placeholder="Enter value..."
                  placeholderTextColor={Colors.textSecondary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  onFocus={() => setValueFocused(true)}
                  onBlur={() => setValueFocused(false)}
                />
              </View>

              <Text style={styles.label}>Description (Optional)</Text>
              <View style={[styles.inputBox, styles.textAreaBox, descFocused && styles.inputBoxActive]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Brief details about what this option is used for..."
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  onFocus={() => setDescFocused(true)}
                  onBlur={() => setDescFocused(false)}
                  scrollEnabled={false}
                />
              </View>

              <View style={styles.activeCard}>
                <View style={styles.activeIcon}>
                  <Ionicons name="power-outline" size={20} color={Colors.primary} />
                </View>
                <View style={styles.activeTextBlock}>
                  <Text style={styles.activeTitle}>Active option</Text>
                  <Text style={styles.activeSubtitle}>
                    Active options appear in dropdown lists immediately.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.customSwitch, isActive && styles.customSwitchActive]}
                  onPress={() => setIsActive((current) => !current)}
                  activeOpacity={0.85}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: isActive }}
                >
                  <View style={[styles.customSwitchKnob, isActive && styles.customSwitchKnobActive]} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => router.back()}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, (!value.trim() || saving) && styles.saveBtnDisabled]}
                onPress={() => void handleSubmit()}
                disabled={!value.trim() || saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {isEditMode ? "Update Option" : "Add Option"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  pageContent: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500",
    lineHeight: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 8,
    marginTop: 14,
  },
  inputBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    overflow: "hidden",
  },
  inputBoxActive: {
    borderColor: Colors.primary,
    backgroundColor: "#FFF",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  textAreaBox: {},
  input: {
    minHeight: 48,
    fontSize: 14,
    color: Colors.text,
    paddingHorizontal: 12,
    width: "100%",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 12,
    paddingBottom: 12,
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
    flexShrink: 0,
  },
  activeTextBlock: {
    flex: 1,
    minWidth: 0,
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
  customSwitch: {
    width: 42,
    height: 24,
    borderRadius: 12,
    padding: 3,
    backgroundColor: "#D1D5DB",
    justifyContent: "center",
    flexShrink: 0,
  },
  customSwitchActive: {
    backgroundColor: "#10B981",
  },
  customSwitchKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFF",
  },
  customSwitchKnobActive: {
    alignSelf: "flex-end",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    marginBottom: 8,
  },
  chip: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: "#FFF",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  saveBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: "700",
  },
});
