import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useMemo } from "react";
import { Keyboard, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "@/constants/Colors";
import { SearchBottomSheet } from "@/components/ui/SearchBottomSheet";

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
  variant?: "default" | "filter";
};

export function SearchableSelectField({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select",
  searchPlaceholder = "Search...",
  emptyMessage = "No options found",
  error,
  disabled = false,
  locked = false,
  required = false,
  variant = "default",
}: SearchableSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);
  const [selectedValue, setSelectedValue] = useState<string | null>(value || null);

  useEffect(() => {
    setSelectedValue(value || null);
  }, [value]);

  const sheetData = useMemo(
    () =>
      options.map((option) => ({
        label: option.label,
        value: option.value,
        description: option.description,
      })),
    [options]
  );
  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedValue),
    [options, selectedValue]
  );
  const isDisabled = disabled || locked;

  return (
    <View style={[
      styles.inputGroup, 
      variant === "filter" && styles.filterInputGroup,
      { zIndex: open ? 5000 : 1 }
    ]}>
      <Text style={[styles.label, variant === "filter" && styles.filterLabel]}>
        {label} {required ? <Text style={styles.required}>*</Text> : null}
      </Text>
      
      <TouchableOpacity
        activeOpacity={0.76}
        disabled={isDisabled}
        onPress={() => {
          Keyboard.dismiss();
          setSheetKey((key) => key + 1);
          setOpen(true);
        }}
        style={[
          styles.inputBox,
          variant === "filter" && styles.filterInputBox,
          error && styles.inputError,
          isDisabled && styles.inputDisabled,
        ]}
      >
        <Text
          style={[styles.text, !selectedOption && styles.placeholderText]}
          numberOfLines={1}
        >
          {selectedOption?.label || placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color={isDisabled ? "#9CA3AF" : Colors.textSecondary}
        />
      </TouchableOpacity>

      {open ? (
        <SearchBottomSheet
          key={sheetKey}
          visible={open}
          title={label}
          data={sheetData}
          selectedValue={selectedValue || undefined}
          placeholder={searchPlaceholder}
          emptyMessage={emptyMessage}
          onClose={() => setOpen(false)}
          onSelect={(newValue) => {
            setSelectedValue(newValue);
            onSelect(newValue);
          }}
        />
      ) : null}
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 20,
  },
  filterInputGroup: {
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  filterLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 5,
    textTransform: "uppercase",
  },
  required: {
    color: Colors.tertiary,
  },
  inputBox: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFF",
  },
  filterInputBox: {
    minHeight: 42,
    borderRadius: 10,
    borderColor: "#D9E2EC",
    paddingHorizontal: 12,
  },
  inputDisabled: {
    backgroundColor: "#F9FAFB",
    opacity: 0.8,
  },
  inputError: {
    borderColor: Colors.tertiary,
  },
  text: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
  },
  placeholderText: {
    color: "#9CA3AF",
    fontWeight: "400",
  },
  fieldErrorText: {
    color: Colors.tertiary,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: "600",
  },
});
