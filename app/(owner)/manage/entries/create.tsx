import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, type ComponentProps } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { z } from "zod";

import { TopAppBar } from "@/components/ui/TopAppBar";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import {
  API_FINANCE_ENTRY_TYPE_VALUES,
  API_OPEN_TRANSACTION_PAYMENT_STATUS_VALUES,
  createFinanceEntry,
  type ApiFinanceEntryType,
  type ApiTransactionPaymentStatus,
} from "@/services/managementApi";
import { getLocalDateValue } from "@/services/dateUtils";

const entrySchema = z.object({
  type: z.enum(API_FINANCE_ENTRY_TYPE_VALUES),
  amount: z.string().min(1, "Amount is required").refine(
    (value) => !Number.isNaN(Number(value.replace(/,/g, ""))) && Number(value.replace(/,/g, "")) > 0,
    "Enter a valid amount",
  ),
  paymentStatus: z.enum(API_OPEN_TRANSACTION_PAYMENT_STATUS_VALUES),
  entryDate: z.string().min(1, "Entry date is required"),
  description: z.string().min(1, "Description is required"),
  notes: z.string().optional(),
});

type EntryFormData = z.infer<typeof entrySchema>;

const TYPE_OPTIONS: {
  value: ApiFinanceEntryType;
  label: string;
  shortLabel: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
}[] = API_FINANCE_ENTRY_TYPE_VALUES.map((value) => ({
  value,
  label: labelize(value),
  shortLabel: value === "OTHER_INCOME" ? "Income" : value === "OTHER_EXPENSE" ? "Expense" : "Invest",
  icon: value === "INVESTMENT" ? "briefcase-outline" : value === "OTHER_INCOME" ? "cash-plus" : "cash-minus",
}));

const STATUS_OPTIONS = API_OPEN_TRANSACTION_PAYMENT_STATUS_VALUES satisfies readonly ApiTransactionPaymentStatus[];

const DEFAULTS: EntryFormData = {
  type: "INVESTMENT",
  amount: "",
  paymentStatus: "PAID",
  entryDate: getToday(),
  description: "",
  notes: "",
};

function getToday() {
  return getLocalDateValue();
}

function labelize(value?: string | null) {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function CreateFinanceEntryScreen() {
  const router = useRouter();
  const { type: routeType } = useLocalSearchParams<{ type?: string }>();
  const { accessToken } = useAuth();
  const { width } = useWindowDimensions();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const compact = width < 360;
  const defaultType = API_FINANCE_ENTRY_TYPE_VALUES.includes(routeType as ApiFinanceEntryType)
    ? (routeType as ApiFinanceEntryType)
    : DEFAULTS.type;

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      ...DEFAULTS,
      type: defaultType,
    },
  });

  const type = watch("type");
  const paymentStatus = watch("paymentStatus");

  const onSubmit = async (data: EntryFormData) => {
    if (!accessToken || saving) return;
    setSaving(true);
    setMessage(null);

    try {
      await createFinanceEntry(accessToken, {
        type: data.type,
        amount: Number(data.amount.replace(/,/g, "")),
        paymentStatus: data.paymentStatus,
        entryDate: data.entryDate.trim(),
        description: data.description.trim(),
        notes: data.notes?.trim() || undefined,
      });

      showSuccessToast("Finance entry created successfully.", "Saved");
      setMessage("Finance entry created successfully.");
      reset(DEFAULTS);
      router.replace({ pathname: "/(owner)/manage/entries" });
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: "Finance entry failed",
          fallbackMessage: "Failed to create finance entry.",
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Create Finance Entry"
        subtitle="POST /finance/entries"
        leadingMode="back"
        onBack={() => router.back()}
      />

      <KeyboardAwareScrollView
        style={styles.keyboardView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
      >
          {message ? <Text style={styles.messageText}>{message}</Text> : null}

          <View style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Entry Type</Text>
            </View>
            <View style={styles.typeSelector}>
              {TYPE_OPTIONS.map((option) => {
                const active = type === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() =>
                      setValue("type", option.value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    activeOpacity={0.82}
                  >
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={compact ? 14 : 16}
                      color={active ? "#FFF" : Colors.primary}
                    />
                    <Text
                      style={[styles.typeChipText, compact && styles.typeChipTextCompact, active && styles.typeChipTextActive]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                    >
                      {compact ? option.shortLabel : option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount</Text>
              <Controller
                control={control}
                name="amount"
                render={({ field: { value, onChange } }) => (
                  <View style={[styles.inputContainer, errors.amount && styles.inputError]}>
                    <Text style={styles.prefix}>Rs</Text>
                    <TextInput
                      style={styles.inputWithPrefix}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="decimal-pad"
                      placeholder="250000"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                )}
              />
              {errors.amount?.message ? <Text style={styles.errorText}>{errors.amount.message}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Status</Text>
              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map((status) => {
                  const active = paymentStatus === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[styles.statusChip, active && styles.statusChipActive]}
                      onPress={() =>
                        setValue("paymentStatus", status, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      activeOpacity={0.82}
                    >
                      <Text style={[styles.statusChipText, active && styles.statusChipTextActive]} numberOfLines={1}>
                        {labelize(status)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Controller
              control={control}
              name="entryDate"
              render={({ field: { value, onChange } }) => (
                <DatePickerField
                  label="Entry Date"
                  value={value}
                  onChange={onChange}
                  error={errors.entryDate?.message}
                  disableFuture
                />
              )}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <Controller
                control={control}
                name="description"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    style={[styles.input, errors.description && styles.inputError]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Owner investment"
                    placeholderTextColor="#9CA3AF"
                  />
                )}
              />
              {errors.description?.message ? <Text style={styles.errorText}>{errors.description.message}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <Controller
                control={control}
                name="notes"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Optional notes"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    scrollEnabled={false}
                  />
                )}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, saving && styles.disabledButton]}
              onPress={handleSubmit(onSubmit)}
              disabled={saving}
              activeOpacity={0.82}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#FFF" />
                  <Text style={styles.submitButtonText}>Save Entry</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  keyboardView: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 80,
  },
  messageText: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CDEBDD",
    backgroundColor: "#F0FBF5",
    color: Colors.primary,
    padding: 10,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 12,
  },
  formCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    gap: 13,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  typeSelector: {
    minHeight: 44,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#DDEFE5",
    backgroundColor: "#F8FAFC",
    padding: 4,
    flexDirection: "row",
    gap: 4,
  },
  typeChip: {
    flex: 1,
    minWidth: 0,
    minHeight: 36,
    borderRadius: 8,
    backgroundColor: "transparent",
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  typeChipText: {
    color: Colors.primary,
    fontSize: 10.5,
    fontWeight: "900",
    flexShrink: 1,
    textAlign: "center",
  },
  typeChipTextCompact: {
    fontSize: 10,
  },
  typeChipTextActive: {
    color: "#FFF",
  },
  inputGroup: {
    gap: 7,
  },
  label: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  input: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D9E2EC",
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  inputContainer: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D9E2EC",
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: Colors.error,
  },
  prefix: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
    marginRight: 8,
  },
  inputWithPrefix: {
    flex: 1,
    height: "100%",
    color: Colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  errorText: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: "800",
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  statusChip: {
    flexGrow: 1,
    flexBasis: 96,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  statusChipActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  statusChipText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: "900",
  },
  statusChipTextActive: {
    color: "#FFF",
  },
  textArea: {
    minHeight: 88,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  submitButton: {
    minHeight: 48,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.7,
  },
});
