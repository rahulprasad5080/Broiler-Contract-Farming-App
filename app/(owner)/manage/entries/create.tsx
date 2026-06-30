import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { z } from "zod";

import { TopAppBar } from "@/components/ui/TopAppBar";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { SearchableSelectField, type SearchableSelectOption } from "@/components/ui/SearchableSelectField";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import {
  createFinanceEntry,
  listAllUsers,
  updateFinanceEntry,
  type ApiUser,
} from "@/services/managementApi";
import { getLocalDateValue } from "@/services/dateUtils";

const entrySchema = z.object({
  amount: z.string().min(1, "Amount is required").refine(
    (value) => !Number.isNaN(Number(value.replace(/,/g, ""))) && Number(value.replace(/,/g, "")) > 0,
    "Enter a valid amount",
  ),
  entryDate: z.string().min(1, "Entry date is required"),
  investedById: z.string().min(1, "Invested by is required"),
  paymentMethod: z.enum(["CASH", "ACCOUNT"]),
  notes: z.string().optional(),
});

type EntryFormData = z.infer<typeof entrySchema>;

const DEFAULTS: EntryFormData = {
  amount: "",
  entryDate: getToday(),
  investedById: "",
  paymentMethod: "CASH",
  notes: "",
};

function getToday() {
  return getLocalDateValue();
}

export default function CreateFinanceEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    entryId?: string;
    amount?: string;
    entryDate?: string;
    investedById?: string;
    paymentMethod?: string;
    notes?: string;
  }>();

  const isEditMode = Boolean(params.entryId);
  const { accessToken } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [owners, setOwners] = useState<ApiUser[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const initialValues = useMemo<EntryFormData>(() => {
    if (isEditMode) {
      return {
        amount: params.amount ? Number(params.amount).toString() : "",
        entryDate: params.entryDate ? params.entryDate.split("T")[0] : getToday(),
        investedById: params.investedById || "",
        paymentMethod: (params.paymentMethod as any) || "CASH",
        notes: params.notes || "",
      };
    }
    return DEFAULTS;
  }, [isEditMode, params]);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: initialValues,
  });

  // Keep form reset in sync with parameter preloading
  useEffect(() => {
    if (!initialized) {
      reset(initialValues);
      setInitialized(true);
    }
  }, [initialValues, reset, initialized]);

  const investedById = watch("investedById");
  const paymentMethod = watch("paymentMethod");

  const loadOwners = useCallback(async () => {
    if (!accessToken) return;
    setLoadingOwners(true);
    try {
      const res = await listAllUsers(accessToken, undefined, "OWNER");
      setOwners(res.data ?? []);
    } catch (error) {
      showRequestErrorToast(error, { title: "Unable to load owners" });
    } finally {
      setLoadingOwners(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadOwners();
  }, [loadOwners]);

  const ownerOptions = useMemo<SearchableSelectOption[]>(
    () =>
      owners.map((owner) => ({
        label: owner.name,
        value: owner.id,
        description: owner.phone ?? undefined,
        keywords: [owner.name, owner.phone].filter(Boolean).join(" "),
      })),
    [owners],
  );

  const onSubmit = async (data: EntryFormData) => {
    if (!accessToken || saving) return;
    setSaving(true);
    setMessage(null);

    try {
      if (isEditMode && params.entryId) {
        await updateFinanceEntry(accessToken, params.entryId, {
          amount: Number(data.amount.replace(/,/g, "")),
          entryDate: data.entryDate.trim(),
          investedById: data.investedById,
          paymentMethod: data.paymentMethod,
          notes: data.notes?.trim() || undefined,
        });

        showSuccessToast("Finance entry updated successfully.", "Saved");
        setMessage("Finance entry updated successfully.");
      } else {
        await createFinanceEntry(accessToken, {
          amount: Number(data.amount.replace(/,/g, "")),
          entryDate: data.entryDate.trim(),
          investedById: data.investedById,
          paymentMethod: data.paymentMethod,
          notes: data.notes?.trim() || undefined,
        });

        showSuccessToast("Finance entry created successfully.", "Saved");
        setMessage("Finance entry created successfully.");
        reset(DEFAULTS);
      }
      router.replace({ pathname: "/(owner)/manage/entries" });
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: isEditMode ? "Finance entry update failed" : "Finance entry failed",
          fallbackMessage: isEditMode ? "Failed to update finance entry." : "Failed to create finance entry.",
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title={isEditMode ? "Edit Finance Entry" : "Create Finance Entry"}
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
          <SearchableSelectField
            label="Invested By"
            value={investedById}
            options={ownerOptions}
            onSelect={(val) => setValue("investedById", val, { shouldDirty: true, shouldValidate: true })}
            placeholder={loadingOwners ? "Loading owners..." : "Select Owner"}
            searchPlaceholder="Search owner"
            emptyMessage="No owners found"
            error={errors.investedById?.message}
            required
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount <Text style={styles.required}>*</Text></Text>
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
            <Text style={styles.label}>Payment Method <Text style={styles.required}>*</Text></Text>
            <View style={styles.typeSelector}>
              {(["CASH", "ACCOUNT"] as const).map((method) => {
                const active = paymentMethod === method;
                return (
                  <TouchableOpacity
                    key={method}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() =>
                      setValue("paymentMethod", method, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    activeOpacity={0.82}
                  >
                    <Ionicons
                      name={method === "CASH" ? "cash-outline" : "card-outline"}
                      size={16}
                      color={active ? "#FFF" : Colors.primary}
                    />
                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                      {method === "CASH" ? "Cash" : "Bank Account"}
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
                <Text style={styles.submitButtonText}>{isEditMode ? "Update Entry" : "Save Entry"}</Text>
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
  inputGroup: {
    gap: 7,
  },
  label: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  required: {
    color: Colors.error,
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
  typeChipTextActive: {
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
