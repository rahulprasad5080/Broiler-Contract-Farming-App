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

import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { TopAppBar } from "@/components/ui/TopAppBar";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import {
  createMasterDataTypeOption,
  type MasterDataTypeCategory,
} from "@/services/managementApi";

const CATEGORIES: { value: MasterDataTypeCategory; label: string }[] = [
  { value: "CATALOG_ITEM_TYPE", label: "Catalog Item" },
  { value: "PURCHASE_TYPE", label: "Purchase" },
  { value: "EXPENSE_CATEGORY", label: "Expense" },
  { value: "TREATMENT_KIND", label: "Treatment" },
];

export default function DropdownCreateScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: MasterDataTypeCategory }>();

  // Use passed category from list page or default to CATALOG_ITEM_TYPE
  const defaultCategory =
    params.category && CATEGORIES.some((c) => c.value === params.category)
      ? params.category
      : "CATALOG_ITEM_TYPE";

  const [category, setCategory] = useState<MasterDataTypeCategory>(defaultCategory);
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!accessToken || !value.trim() || saving) return;

    setSaving(true);
    // Convert spaces to underscores and uppercase the value
    const formattedValue = value.trim().toUpperCase().replace(/\s+/g, "_");

    try {
      await createMasterDataTypeOption(accessToken, {
        category,
        value: formattedValue,
        description: description.trim() || undefined,
        isActive: true,
      });

      showSuccessToast(
        `Successfully added '${formattedValue}' to dropdown list.`,
        "Created"
      );
      router.back();
    } catch (error) {
      showRequestErrorToast(error, {
        title: "Failed to create option",
        fallbackMessage: "Could not add new dropdown option.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <View style={styles.pageContent}>
        <TopAppBar
          title="Add Option"
          subtitle="Create new custom dropdown entry"
          leadingMode="back"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Text style={styles.label}>Dropdown Category</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((cat) => {
                  const active = cat.value === category;
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setCategory(cat.value)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Option Value</Text>
              <Text style={styles.helpText}>
                Will automatically convert to UPPERCASE and replace spaces with underscores (e.g.
                "VACCINE_SHED" or "BROILER_FEED").
              </Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={setValue}
                  placeholder="e.g. MEDICINE_PLUS"
                  placeholderTextColor={Colors.textSecondary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>

              <Text style={styles.label}>Description (Optional)</Text>
              <View style={[styles.inputBox, styles.textAreaBox]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Brief details about what this option is used for..."
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, (!value.trim() || saving) && styles.saveBtnDisabled]}
              onPress={() => void handleSubmit()}
              disabled={!value.trim() || saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Add Option</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => router.back()}
              disabled={saving}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  pageContent: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 8,
    marginTop: 14,
  },
  helpText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 6,
    lineHeight: 15,
  },
  inputBox: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  textAreaBox: {
    paddingVertical: 8,
  },
  input: {
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  textArea: {
    height: 60,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: "#FFF",
  },
  saveBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
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
