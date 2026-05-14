import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/Colors";
import { Layout } from "@/constants/Layout";

export type SearchableSelectOption = {
  label: string;
  value: string;
  description?: string;
  keywords?: string;
};

type SearchableSelectFieldProps = {
  label: string;
  value?: string;
  options: SearchableSelectOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  error?: string;
  disabled?: boolean;
  locked?: boolean;
  required?: boolean;
};

export function SearchableSelectField({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select",
  searchPlaceholder = "Search",
  emptyMessage = "No options found",
  error,
  disabled = false,
  locked = false,
  required = false,
}: SearchableSelectFieldProps) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter((option) => {
      const haystack = [
        option.label,
        option.description,
        option.keywords,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [options, query]);

  const openPicker = () => {
    if (disabled || locked) return;
    setQuery("");
    setVisible(true);
  };

  const closePicker = () => setVisible(false);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label} {required ? <Text style={styles.required}>*</Text> : null}
      </Text>
      <TouchableOpacity
        style={[
          styles.inputBox,
          error && styles.inputError,
          (disabled || locked) && styles.inputDisabled,
        ]}
        onPress={openPicker}
        activeOpacity={0.78}
        disabled={disabled || locked}
      >
        <View style={styles.valueBlock}>
          <Text
            style={[
              styles.valueText,
              !selectedOption && styles.placeholderText,
            ]}
            numberOfLines={1}
          >
            {selectedOption?.label ?? placeholder}
          </Text>
          {selectedOption?.description ? (
            <Text style={styles.descriptionText} numberOfLines={1}>
              {selectedOption.description}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name={locked ? "lock-closed-outline" : "chevron-down"}
          size={18}
          color={Colors.textSecondary}
        />
      </TouchableOpacity>
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closePicker}
        >
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={closePicker}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor={Colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              style={styles.optionList}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>{emptyMessage}</Text>
                </View>
              }
              renderItem={({ item }) => {
                const selected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[styles.optionRow, selected && styles.optionRowActive]}
                    onPress={() => {
                      onSelect(item.value);
                      closePicker();
                    }}
                    activeOpacity={0.78}
                  >
                    <View style={styles.optionTextBlock}>
                      <Text style={styles.optionLabel}>{item.label}</Text>
                      {item.description ? (
                        <Text style={styles.optionDescription}>{item.description}</Text>
                      ) : null}
                    </View>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  required: {
    color: Colors.tertiary,
  },
  inputBox: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFF",
  },
  inputDisabled: {
    backgroundColor: "#F9FAFB",
  },
  inputError: {
    borderColor: Colors.tertiary,
  },
  valueBlock: {
    flex: 1,
  },
  valueText: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
  },
  placeholderText: {
    color: "#9CA3AF",
    fontWeight: "400",
  },
  descriptionText: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  fieldErrorText: {
    color: Colors.tertiary,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "78%",
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    ...Layout.cardShadow,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F6F8",
  },
  searchBox: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  optionList: {
    marginHorizontal: -6,
  },
  optionRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
  },
  optionRowActive: {
    backgroundColor: "#E7F5ED",
  },
  optionTextBlock: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  optionDescription: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
});
