import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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

import { DatePickerField } from "@/components/ui/DatePickerField";
import { ScreenState } from "@/components/ui/ScreenState";
import { SearchableSelectField, type SearchableSelectOption } from "@/components/ui/SearchableSelectField";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { getLocalDateValue } from "@/services/dateUtils";
import {
  createFinancePayment,
  listAllTraders,
  listAllVendors,
  type ApiTrader,
  type ApiVendor,
} from "@/services/managementApi";

const numberString = (label: string) =>
  z.string().min(1, `${label} is required`).refine(
    (value) => !Number.isNaN(Number(value.replace(/,/g, ""))),
    `${label} must be a number`,
  );

const paymentSchema = z.object({
  vendorId: z.string().optional(),
  traderId: z.string().optional(),
  partyName: z.string().optional(),
  paymentMode: z.enum(["CASH", "ACCOUNT"]),
  amount: numberString("Amount"),
  paymentDate: z.string().min(1, "Payment date is required"),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const DEFAULTS: PaymentFormData = {
  vendorId: "",
  traderId: "",
  partyName: "",
  paymentMode: "CASH",
  amount: "",
  paymentDate: getLocalDateValue(),
  notes: "",
};

function toNumber(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function labelize(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function CreatePaymentScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: "payment" | "receipt" }>();
  const partyType = type === "receipt" ? "trader" : "vendor";
  const { accessToken } = useAuth();
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [traders, setTraders] = useState<ApiTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: DEFAULTS,
  });

  const vendorId = watch("vendorId");
  const traderId = watch("traderId");
  const paymentMode = watch("paymentMode");

  const vendorOptions = useMemo<SearchableSelectOption[]>(
    () =>
      vendors.map((vendor) => ({
        label: vendor.name,
        value: vendor.id,
        description: vendor.phone ?? undefined,
        keywords: [vendor.address, vendor.phone].filter(Boolean).join(" "),
      })),
    [vendors],
  );

  const traderOptions = useMemo<SearchableSelectOption[]>(
    () =>
      traders.map((trader) => ({
        label: trader.name,
        value: trader.id,
        description: trader.phone ?? undefined,
        keywords: [trader.address, trader.phone].filter(Boolean).join(" "),
      })),
    [traders],
  );

  const loadOptions = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [vendorRes, traderRes] = await Promise.all([
        listAllVendors(accessToken),
        listAllTraders(accessToken),
      ]);
      setVendors(vendorRes.data ?? []);
      setTraders(traderRes.data ?? []);
    } catch (error) {
      showRequestErrorToast(error, { title: "Unable to load payment options" });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadOptions();
    }, [loadOptions]),
  );

  const onVendorSelect = (value: string) => {
    const vendor = vendors.find((item) => item.id === value);
    setValue("vendorId", value, { shouldDirty: true, shouldValidate: true });
    if (vendor) {
      setValue("partyName", vendor.name, { shouldDirty: true, shouldValidate: true });
    }
  };

  const onTraderSelect = (value: string) => {
    const trader = traders.find((item) => item.id === value);
    setValue("traderId", value, { shouldDirty: true, shouldValidate: true });
    if (trader) {
      setValue("partyName", trader.name, { shouldDirty: true, shouldValidate: true });
    }
  };

  const onSubmit = async (data: PaymentFormData) => {
    if (partyType === "vendor" && !data.vendorId) {
      setError("vendorId", { type: "manual", message: "Vendor is required" });
      return;
    }
    if (partyType === "trader" && !data.traderId) {
      setError("traderId", { type: "manual", message: "Trader is required" });
      return;
    }

    if (!accessToken || saving) return;
    setSaving(true);
    setSavedMessage(null);

    try {
      await createFinancePayment(accessToken, {
        vendorId: data.vendorId?.trim() || undefined,
        traderId: data.traderId?.trim() || undefined,
        partyName: data.partyName?.trim() || undefined,
        paymentMode: data.paymentMode,
        amount: toNumber(data.amount),
        paymentDate: data.paymentDate,
        notes: data.notes?.trim() || undefined,
      });

      showSuccessToast(type === "receipt" ? "Receipt created successfully." : "Payment created successfully.");
      setSavedMessage(type === "receipt" ? "Receipt created successfully." : "Payment created successfully.");
      reset(DEFAULTS);
      router.replace({ pathname: type === "receipt" ? "/(owner)/manage/receipts" : "/(owner)/manage/payments" });
    } catch (error) {
      showRequestErrorToast(error, { title: "Payment save failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title={type === "receipt" ? "Create Receipt" : "Create Payment"}
        leadingMode="back"
        onBack={() => router.back()}
      />
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
      >
          {loading ? (
            <ScreenState title="Loading payment form" message="Fetching dropdown options..." loading compact style={styles.stateSpacing} />
          ) : null}
          {savedMessage ? (
            <ScreenState title={savedMessage} message={type === "receipt" ? "Returning to receipt list." : "Returning to payment list."} compact style={styles.stateSpacing} />
          ) : null}

          <View style={styles.formCard}>


            {partyType === "vendor" && (
              <SearchableSelectField
                label="Vendor"
                value={vendorId}
                options={vendorOptions}
                onSelect={onVendorSelect}
                placeholder="Select Vendor"
                searchPlaceholder="Search vendor"
                emptyMessage="No vendors found"
                error={errors.vendorId?.message}
                required
              />
            )}

            {partyType === "trader" && (
              <SearchableSelectField
                label="Trader"
                value={traderId}
                options={traderOptions}
                onSelect={onTraderSelect}
                placeholder="Select Trader"
                searchPlaceholder="Search trader"
                emptyMessage="No traders found"
                error={errors.traderId?.message}
                required
              />
            )}



            <ControlledInput
              control={control}
              name="amount"
              label="Amount"
              placeholder="0"
              keyboardType="numeric"
              error={errors.amount?.message}
              required
            />

            <View style={styles.segmentedContainer}>
              <Text style={styles.label}>
                Payment Mode <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.segmentedControl}>
                {(["CASH", "ACCOUNT"] as const).map((mode) => {
                  const active = paymentMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.segmentButton, active && styles.segmentButtonActive]}
                      onPress={() =>
                        setValue("paymentMode", mode, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      activeOpacity={0.82}
                    >
                      <Ionicons
                        name={mode === "CASH" ? "cash-outline" : "card-outline"}
                        size={16}
                        color={active ? "#FFF" : "#4B5563"}
                      />
                      <Text
                        style={[
                          styles.segmentButtonText,
                          active && styles.segmentButtonTextActive,
                        ]}
                      >
                        {mode === "CASH" ? "Cash" : "Bank Account"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Controller
              control={control}
              name="paymentDate"
              render={({ field: { value, onChange } }) => (
                <DatePickerField
                  label="Payment Date"
                  value={value}
                  onChange={onChange}
                  error={errors.paymentDate?.message}
                  disableFuture
                />
              )}
            />

            <ControlledInput
              control={control}
              name="notes"
              label="Notes"
              placeholder="Add notes/remarks..."
              error={errors.notes?.message}
              multiline
            />

            <TouchableOpacity
              style={[styles.submitButton, saving && styles.submitButtonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#FFF" />
                  <Text style={styles.submitButtonText}>Save Payment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

type ControlledInputProps = {
  control: ReturnType<typeof useForm<PaymentFormData>>["control"];
  name: keyof PaymentFormData;
  label: string;
  placeholder: string;
  error?: string;
  required?: boolean;
  keyboardType?: "default" | "numeric" | "email-address" | "url";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
};

function ControlledInput({
  control,
  name,
  label,
  placeholder,
  error,
  required,
  keyboardType = "default",
  autoCapitalize = "sentences",
  multiline = false,
}: ControlledInputProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label} {required ? <Text style={styles.required}>*</Text> : null}
      </Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange } }) => (
          <TextInput
            style={[styles.input, multiline && styles.textArea]}
            value={String(value ?? "")}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            multiline={multiline}
            scrollEnabled={multiline ? false : undefined}
          />
        )}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#F4F6F8",
    padding: 14,
    paddingBottom: 80,
  },
  stateSpacing: {
    marginBottom: 12,
  },
  formCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },
  required: {
    color: Colors.error,
  },
  input: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    color: Colors.text,
    fontSize: 15,
  },
  textArea: {
    minHeight: 96,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "900",
  },
  segmentedContainer: {
    marginBottom: 20,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  segmentButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: Colors.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  segmentButtonTextActive: {
    color: "#FFF",
    fontWeight: "700",
  },
});
