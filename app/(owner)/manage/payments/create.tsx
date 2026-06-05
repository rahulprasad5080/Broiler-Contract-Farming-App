import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
    API_PAYMENT_DIRECTION_VALUES,
    API_PAYMENT_ENTRY_TYPE_VALUES,
    createFinancePayment,
    listAllBatches,
    listAllTraders,
    listAllVendors,
    type ApiBatch,
    type ApiPaymentDirection,
    type ApiPaymentEntryType,
    type ApiTrader,
    type ApiVendor,
} from "@/services/managementApi";

const numberString = (label: string) =>
  z.string().min(1, `${label} is required`).refine(
    (value) => !Number.isNaN(Number(value.replace(/,/g, ""))),
    `${label} must be a number`,
  );

const paymentSchema = z.object({
  batchId: z.string().optional(),
  vendorId: z.string().optional(),
  traderId: z.string().optional(),
  partyName: z.string().optional(),
  paymentType: z.enum(API_PAYMENT_ENTRY_TYPE_VALUES),
  direction: z.enum(API_PAYMENT_DIRECTION_VALUES),
  amount: numberString("Amount"),
  paymentDate: z.string().min(1, "Payment date is required"),
    referenceType: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const DEFAULTS: PaymentFormData = {
  batchId: "",
  vendorId: "",
  traderId: "",
  partyName: "",
  paymentType: "PURCHASE",
  direction: "INBOUND",
  amount: "",
  paymentDate: getLocalDateValue(),
    referenceType: "",
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
  const { accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [traders, setTraders] = useState<ApiTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [partyType, setPartyType] = useState<'vendor' | 'trader'>('vendor');

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

  const handlePartyTypeChange = (type: 'vendor' | 'trader') => {
    setPartyType(type);
    setValue("vendorId", "", { shouldDirty: true, shouldValidate: true });
    setValue("traderId", "", { shouldDirty: true, shouldValidate: true });
    setValue("partyName", "", { shouldDirty: true, shouldValidate: true });
    clearErrors(["vendorId", "traderId", "partyName"]);
  };

  const batchId = watch("batchId");
  const vendorId = watch("vendorId");
  const traderId = watch("traderId");
  const paymentType = watch("paymentType");
  const direction = watch("direction");
  const referenceType = watch("referenceType");

  const batchOptions = useMemo<SearchableSelectOption[]>(
    () =>
      batches.map((batch) => ({
        label: batch.code,
        value: batch.id,
        description: batch.farmName ?? undefined,
        keywords: batch.status,
      })),
    [batches],
  );

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

  const paymentTypeOptions = useMemo<SearchableSelectOption[]>(
    () =>
      API_PAYMENT_ENTRY_TYPE_VALUES.map((type) => ({
        label: labelize(type),
        value: type,
      })),
    [],
  );

  const directionOptions = useMemo<SearchableSelectOption[]>(
    () =>
      API_PAYMENT_DIRECTION_VALUES.map((item) => ({
        label: labelize(item),
        value: item,
      })),
    [],
  );

  const referenceTypeOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { label: "No Reference Type", value: "" },
      ...API_PAYMENT_ENTRY_TYPE_VALUES.map((type) => ({
        label: labelize(type),
        value: type,
      })),
    ],
    [],
  );

  const loadOptions = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [batchRes, vendorRes, traderRes] = await Promise.all([
        listAllBatches(accessToken),
        listAllVendors(accessToken),
        listAllTraders(accessToken),
      ]);
      setBatches(batchRes.data ?? []);
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
        batchId: data.batchId?.trim() || undefined,
        vendorId: data.vendorId?.trim() || undefined,
        traderId: data.traderId?.trim() || undefined,
        partyName: data.partyName?.trim() || undefined,
        paymentType: data.paymentType as ApiPaymentEntryType,
        direction: data.direction as ApiPaymentDirection,
        amount: toNumber(data.amount),
        paymentDate: data.paymentDate,
          referenceType: data.referenceType?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      });

      showSuccessToast("Payment created successfully.");
      setSavedMessage("Payment created successfully.");
      reset(DEFAULTS);
      router.replace({ pathname: "/(owner)/manage/payments" });
    } catch (error) {
      showRequestErrorToast(error, { title: "Payment save failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Create Payment"
        subtitle="POST /finance/payments"
        leadingMode="back"
        onBack={() => router.back()}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <ScreenState title="Loading payment form" message="Fetching dropdown options..." loading compact style={styles.stateSpacing} />
          ) : null}
          {savedMessage ? (
            <ScreenState title={savedMessage} message="Returning to payment list." compact style={styles.stateSpacing} />
          ) : null}

          <View style={styles.formCard}>
            <SearchableSelectField
                          label="Batch"
              value={batchId}
              options={batchOptions}
              onSelect={(value) => setValue("batchId", value, { shouldDirty: true, shouldValidate: true })}
              placeholder="Select Batch"
              searchPlaceholder="Search batch"
              emptyMessage="No batches found"
              error={errors.batchId?.message}
            />

            {/* Party Type Selection */}
            <View style={styles.segmentedContainer}>
              <Text style={styles.label}>
                Party Type <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    partyType === "vendor" && styles.segmentButtonActive,
                  ]}
                  onPress={() => handlePartyTypeChange("vendor")}
                >
                  <Ionicons
                    name="business-outline"
                    size={16}
                    color={partyType === "vendor" ? "#FFF" : "#4B5563"}
                  />
                  <Text
                    style={[
                      styles.segmentButtonText,
                      partyType === "vendor" && styles.segmentButtonTextActive,
                    ]}
                  >
                    Vendor
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    partyType === "trader" && styles.segmentButtonActive,
                  ]}
                  onPress={() => handlePartyTypeChange("trader")}
                >
                  <Ionicons
                    name="people-outline"
                    size={16}
                    color={partyType === "trader" ? "#FFF" : "#4B5563"}
                  />
                  <Text
                    style={[
                      styles.segmentButtonText,
                      partyType === "trader" && styles.segmentButtonTextActive,
                    ]}
                  >
                    Trader
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

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

            <SearchableSelectField
              label="Payment Type"
              value={paymentType}
              options={paymentTypeOptions}
              onSelect={(value) => setValue("paymentType", value as ApiPaymentEntryType, { shouldDirty: true, shouldValidate: true })}
              placeholder="Select Payment Type"
              searchPlaceholder="Search payment type"
              emptyMessage="No payment types found"
              error={errors.paymentType?.message}
              required
            />

            <SearchableSelectField
              label="Direction"
              value={direction}
              options={directionOptions}
              onSelect={(value) => setValue("direction", value as ApiPaymentDirection, { shouldDirty: true, shouldValidate: true })}
              placeholder="Select Direction"
              searchPlaceholder="Search direction"
              emptyMessage="No directions found"
              error={errors.direction?.message}
              required
            />

            <ControlledInput
              control={control}
              name="amount"
              label="Amount"
              placeholder="0"
              keyboardType="numeric"
              error={errors.amount?.message}
              required
            />

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

            <SearchableSelectField
              label="Reference Type"
              value={referenceType}
              options={referenceTypeOptions}
              onSelect={(value) => setValue("referenceType", value, { shouldDirty: true, shouldValidate: true })}
              placeholder="Select Reference Type"
              searchPlaceholder="Search reference type"
              emptyMessage="No reference types found"
              error={errors.referenceType?.message}
            />

            <ControlledInput
              control={control}
              name="notes"
              label="Notes"
              placeholder="Payment notes"
              multiline
              error={errors.notes?.message}
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
          <View style={{ height: 36 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    backgroundColor: "#0B5C36",
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#F4F6F8",
    padding: 14,
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
