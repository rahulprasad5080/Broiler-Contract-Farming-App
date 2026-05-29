import { useAuth } from "@/context/AuthContext";
import {
  ApiBatch,
  ApiTrader,
  createSale,
  listAllBatches,
  listAllTraders,
} from "@/services/managementApi";
import { useFocusEffect } from "@react-navigation/native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
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

import { DatePickerField } from "@/components/ui/DatePickerField";
import { ScreenState } from "@/components/ui/ScreenState";
import { SearchableSelectField } from "@/components/ui/SearchableSelectField";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { getLocalDateValue } from "@/services/dateUtils";
import { enqueueOfflineSubmission, isNetworkConnected } from "@/services/offlineSyncQueue";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

function todayValue() {
  return getLocalDateValue();
}

function parseNumberInput(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return undefined;
  const next = Number(normalized);
  return Number.isNaN(next) ? undefined : next;
}

const numericField = (label: string) =>
  z.string().min(1, `${label} is required`).refine((value) => parseNumberInput(value) !== undefined, {
    message: `${label} must be a number`,
  });

const salesEntrySchema = z.object({
  batchId: z.string().min(1, "Please select a batch"),
  traderId: z.string().min(1, "Please select a customer"),
  saleDate: z.string().min(1, "Date is required"),
  birdCount: numericField("Quantity sold"),
  totalWeightKg: numericField("Total weight"),
  averageWeightKg: z.string().optional(),
  ratePerKg: numericField("Rate"),
  rateType: z.enum(["LIVE", "DRESSED"]),
  notes: z.string().optional(),
});

type SalesEntryFormData = z.infer<typeof salesEntrySchema>;

const SALES_ENTRY_DEFAULTS: SalesEntryFormData = {
  batchId: "",
  traderId: "",
  saleDate: todayValue(),
  birdCount: "",
  totalWeightKg: "",
  averageWeightKg: "",
  ratePerKg: "",
  rateType: "LIVE",
  notes: "",
};

const STATUS_MESSAGE_TIMEOUT_MS = 4000;

interface SalesEntryScreenProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
}

export function SalesEntryScreen({ title = "Sales Entry", subtitle, onBack }: SalesEntryScreenProps) {
  const { accessToken, user } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [traders, setTraders] = useState<ApiTrader[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [showRestoredMessage, setShowRestoredMessage] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SalesEntryFormData>({
    resolver: zodResolver(salesEntrySchema),
    defaultValues: SALES_ENTRY_DEFAULTS,
  });
  const { clearPersistedData, isRestored } = useFormPersistence(
    "form_draft_sales_entry",
    watch,
    reset,
    SALES_ENTRY_DEFAULTS,
  );

  const selectedBatchId = watch("batchId");
  const selectedTraderId = watch("traderId");
  const birdCount = watch("birdCount");
  const totalWeightKg = watch("totalWeightKg");
  const ratePerKg = watch("ratePerKg");
  const rateType = watch("rateType");
  const canUseLiveRate = user?.role === "OWNER";

  const activeBatches = useMemo(
    () => batches.filter((batch) => batch.status === "ACTIVE" || batch.status === "SALES_RUNNING"),
    [batches]
  );
  const batchOptions = useMemo(
    () =>
      activeBatches.map((batch) => ({
        label: batch.code,
        value: batch.id,
        description: batch.farmName ?? undefined,
        keywords: `${batch.farmName ?? ""} ${batch.status}`,
      })),
    [activeBatches],
  );
  const traderOptions = useMemo(
    () =>
      traders.map((trader) => ({
        label: trader.name,
        value: trader.id,
        description: trader.phone ?? undefined,
        keywords: trader.phone ?? "",
      })),
    [traders],
  );

  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId) ?? null;
  const liveBirdCount =
    selectedBatch?.summary?.liveBirds ?? selectedBatch?.placementCount ?? null;
  const liveBirdDisplay =
    liveBirdCount !== null ? Number(liveBirdCount).toLocaleString("en-IN") : "Not available";

  const averageWeightKg = useMemo(() => {
    const qty = parseNumberInput(birdCount) || 0;
    const totalWeight = parseNumberInput(totalWeightKg) || 0;
    if (qty <= 0 || totalWeight <= 0) return 0;
    return totalWeight / qty;
  }, [birdCount, totalWeightKg]);

  const averageWeightDisplay = averageWeightKg > 0 ? averageWeightKg.toFixed(3) : "";

  useEffect(() => {
    setValue("averageWeightKg", averageWeightDisplay, { shouldValidate: true });
  }, [averageWeightDisplay, setValue]);

  useEffect(() => {
    if (user && !canUseLiveRate && rateType !== "DRESSED") {
      setValue("rateType", "DRESSED", { shouldDirty: true, shouldValidate: true });
    }
  }, [canUseLiveRate, rateType, setValue, user]);

  useEffect(() => {
    if (!isRestored) return;

    setShowRestoredMessage(true);
    const timeoutId = setTimeout(() => {
      setShowRestoredMessage(false);
    }, STATUS_MESSAGE_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [isRestored]);

  useEffect(() => {
    if (!savedMessage) return;

    const timeoutId = setTimeout(() => {
      setSavedMessage(null);
    }, STATUS_MESSAGE_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [savedMessage]);

  const totalAmount = useMemo(() => {
    const totalWeight = parseNumberInput(totalWeightKg) || 0;
    const rate = parseNumberInput(ratePerKg) || 0;
    return totalWeight * rate;
  }, [totalWeightKg, ratePerKg]);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [batchesRes, tradersRes] = await Promise.all([
        listAllBatches(accessToken),
        listAllTraders(accessToken),
      ]);
      setBatches(batchesRes.data);
      setTraders(tradersRes.data);

      const firstActiveId = batchesRes.data.find((b) => b.status === "ACTIVE" || b.status === "SALES_RUNNING")?.id;
      if (firstActiveId && !selectedBatchId) {
        setValue("batchId", firstActiveId);
      }
    } catch (error) {
      showRequestErrorToast(error, { title: "Unable to load data" });
    }
  }, [accessToken, selectedBatchId, setValue]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const onSubmit = async (data: SalesEntryFormData) => {
    if (!accessToken || submitting) return;
    setSavedMessage(null);
    setSubmitting(true);
    try {
      const qty = parseNumberInput(data.birdCount) || 0;
      if (liveBirdCount !== null && qty > liveBirdCount) {
        const message =
          liveBirdCount <= 0
            ? "No live birds available in this batch."
            : `Only ${Number(liveBirdCount).toLocaleString("en-IN")} live birds available.`;
        setError("birdCount", { type: "validate", message });
        showRequestErrorToast(new Error(message), { title: "Invalid quantity" });
        return;
      }

      const totalWeight = parseNumberInput(data.totalWeightKg) || 0;
      const weight = qty > 0 ? totalWeight / qty : 0;
      const rate = parseNumberInput(data.ratePerKg) || 0;
      const total = totalWeight * rate;
      const payload = {
        traderId: data.traderId,
        saleDate: data.saleDate,
        birdCount: qty,
        totalWeightKg: totalWeight,
        averageWeightKg: weight,
        ratePerKg: rate,
        grossAmount: total,
        netAmount: total,
        notes: data.notes?.trim() || undefined,
        clientReferenceId: `sale-${Date.now()}`,
      };

      if (!(await isNetworkConnected())) {
        await enqueueOfflineSubmission({
          type: "sales-entry",
          payload: { batchId: data.batchId, body: payload },
        });
        await clearPersistedData();
        showSuccessToast("Saved offline. It will sync automatically.");
        setSavedMessage("Saved offline. It will sync when internet returns.");
        reset({ ...SALES_ENTRY_DEFAULTS, batchId: data.batchId });
        return;
      }

      await createSale(accessToken, data.batchId, payload);
      showSuccessToast("Sales entry saved successfully.");
      setSavedMessage("Sales entry saved successfully.");
      await clearPersistedData();
      reset({ ...SALES_ENTRY_DEFAULTS, batchId: data.batchId });
    } catch (error) {
      showRequestErrorToast(error, { title: "Save failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar title={title} subtitle={subtitle} onBack={onBack} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            {showRestoredMessage ? (
              <ScreenState
                title="Draft restored"
                message="Your unsaved sales entry was restored."
                compact
                style={styles.stateSpacing}
              />
            ) : null}
            {savedMessage ? (
              <ScreenState
                title={savedMessage}
                message="Form is ready for the next sale."
                compact
                style={styles.stateSpacing}
              />
            ) : null}
            {/* Date */}
            <Controller
              control={control}
              name="saleDate"
              render={({ field: { value, onChange } }) => (
                <DatePickerField
                  label="Date"
                  value={value}
                  onChange={onChange}
                  error={errors.saleDate?.message}
                  disableFuture
                />
              )}
            />

            {/* Batch */}
            <SearchableSelectField
              label="Batch"
              value={selectedBatchId}
              options={batchOptions}
              onSelect={(value) => setValue("batchId", value, { shouldDirty: true, shouldValidate: true })}
              placeholder="Select Batch"
              searchPlaceholder="Search batch or farm"
              emptyMessage="No sales-ready batches found"
              error={errors.batchId?.message}
            />
            {selectedBatch ? (
              <View style={styles.liveBirdBox}>
                <Text style={styles.liveBirdLabel}>Live Birds Available</Text>
                <Text style={[styles.liveBirdValue, liveBirdCount === 0 && styles.liveBirdValueDanger]}>
                  {liveBirdDisplay}
                </Text>
              </View>
            ) : null}

            {/* Customer / Buyer */}
            <SearchableSelectField
              label="Customer / Buyer"
              value={selectedTraderId}
              options={traderOptions}
              onSelect={(value) => setValue("traderId", value, { shouldDirty: true, shouldValidate: true })}
              placeholder="Select Customer"
              searchPlaceholder="Search customer"
              emptyMessage="No customers found"
              error={errors.traderId?.message}
            />

            {/* Quantity Sold */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Quantity Sold</Text>
              <Controller
                control={control}
                name="birdCount"
                render={({ field: { value, onChange } }) => (
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.inputWithSuffix}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="numeric"
                      placeholder="5,000"
                      placeholderTextColor="#9CA3AF"
                    />
                    <Text style={styles.suffix}>birds</Text>
                  </View>
                )}
              />
              {errors.birdCount && <Text style={styles.errorText}>{errors.birdCount.message}</Text>}
            </View>

            {/* Total Weight */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Total Weight (kg)</Text>
              <Controller
                control={control}
                name="totalWeightKg"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    keyboardType="numeric"
                    placeholder="10,750"
                    placeholderTextColor="#9CA3AF"
                  />
                )}
              />
              {errors.totalWeightKg && <Text style={styles.errorText}>{errors.totalWeightKg.message}</Text>}
            </View>

            {/* Average Weight */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Average Weight (kg)</Text>
              <View style={styles.inputMock}>
                <Text style={[styles.inputValue, !averageWeightDisplay && styles.placeholderText]}>
                  {averageWeightDisplay || "Auto calculated"}
                </Text>
              </View>
              {errors.averageWeightKg && <Text style={styles.errorText}>{errors.averageWeightKg.message}</Text>}
            </View>

            {canUseLiveRate ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Rate Type</Text>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, rateType === "LIVE" && styles.toggleBtnActive]}
                    onPress={() => setValue("rateType", "LIVE")}
                  >
                    <Text style={[styles.toggleBtnText, rateType === "LIVE" && styles.toggleBtnTextActive]}>
                      Live Rate
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, rateType === "DRESSED" && styles.toggleBtnActive]}
                    onPress={() => setValue("rateType", "DRESSED")}
                  >
                    <Text style={[styles.toggleBtnText, rateType === "DRESSED" && styles.toggleBtnTextActive]}>
                      Dressed Rate
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* Rate */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {canUseLiveRate && rateType === "LIVE" ? "Live Rate" : "Dressed Rate"} (₹ / kg)
              </Text>
              <Controller
                control={control}
                name="ratePerKg"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    keyboardType="numeric"
                    placeholder="112"
                    placeholderTextColor="#9CA3AF"
                  />
                )}
              />
              {errors.ratePerKg && <Text style={styles.errorText}>{errors.ratePerKg.message}</Text>}
            </View>

            {/* Total Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Total Amount (₹)</Text>
              <Text style={styles.totalAmountText}>₹ {totalAmount.toLocaleString('en-IN')}</Text>
            </View>

            {/* Remarks */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Remarks (Optional)</Text>
              <Controller
                control={control}
                name="notes"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Morning sale completed"
                    placeholderTextColor="#9CA3AF"
                    multiline
                  />
                )}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.btnDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Save Sales Entry</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B5C36"
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  form: {
    flex: 1,
  },
  stateSpacing: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: "#111827",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputWithSuffix: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    height: "100%",
  },
  suffix: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginLeft: 8,
  },
  inputMock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputValue: {
    fontSize: 15,
    color: "#374151",
  },
  liveBirdBox: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: -8,
    marginBottom: 20,
  },
  liveBirdLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 4,
  },
  liveBirdValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0B5C36",
  },
  liveBirdValueDanger: {
    color: "#DC2626",
  },
  placeholderText: {
    color: "#9CA3AF",
  },
  textArea: {
    height: 100,
    paddingTop: 16,
    textAlignVertical: "top",
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#0B5C36",
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  toggleBtnTextActive: {
    color: "#FFF",
  },
  totalAmountText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0B5C36",
    marginTop: 4,
  },
  dropdownList: {
    marginTop: 4,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#374151",
  },
  submitBtn: {
    backgroundColor: "#0B5C36",
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
