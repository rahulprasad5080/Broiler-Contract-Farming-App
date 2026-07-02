import { useAuth } from "@/context/AuthContext";
import {
  API_SALE_STATUS_VALUES,
  API_TRANSACTION_PAYMENT_STATUS_VALUES,
  ApiBatch,
  ApiTrader,
  createSale,
  listAllBatches,
  listAllTraders,
  type ApiSaleStatus,
  type ApiTransactionPaymentStatus,
} from "@/services/managementApi";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
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

function labelize(value?: string | null) {
  if (!value) return "Not set";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

const numericField = (label: string) =>
  z.string().min(1, `${label} is required`).refine((value) => parseNumberInput(value) !== undefined, {
    message: `${label} must be a number`,
  });

const salesEntrySchema = z.object({
  batchId: z.string().min(1, "Please select a batch"),
  traderId: z.string().min(1, "Please select a customer"),
  saleDate: z.string().min(1, "Date is required"),
  vehicleNumber: z.string().optional(),
  birdCount: numericField("Quantity sold"),
  totalWeightKg: numericField("Total weight"),
  averageWeightKg: z.string().optional(),
  loadingMortalityCount: z.string().optional().refine((value) => !value || parseNumberInput(value) !== undefined, {
    message: "Loading mortality must be a number",
  }),
  ratePerKg: numericField("Rate"),
  rateType: z.enum(["LIVE", "DRESSED"]),
  transportCharge: z.string().optional().refine((value) => !value || parseNumberInput(value) !== undefined, {
    message: "Transport charge must be a number",
  }),
  commissionCharge: z.string().optional().refine((value) => !value || parseNumberInput(value) !== undefined, {
    message: "Commission charge must be a number",
  }),
  otherDeduction: z.string().optional().refine((value) => !value || parseNumberInput(value) !== undefined, {
    message: "Other deduction must be a number",
  }),
  paymentReceivedAmount: z.string().optional().refine((value) => !value || parseNumberInput(value) !== undefined, {
    message: "Payment received must be a number",
  }),
  paymentStatus: z.enum(API_TRANSACTION_PAYMENT_STATUS_VALUES),
  status: z.enum(API_SALE_STATUS_VALUES),
  notes: z.string().optional(),
});

type SalesEntryFormData = z.infer<typeof salesEntrySchema>;

const SALES_ENTRY_DEFAULTS: SalesEntryFormData = {
  batchId: "",
  traderId: "",
  saleDate: todayValue(),
  vehicleNumber: "",
  birdCount: "",
  totalWeightKg: "",
  averageWeightKg: "",
  loadingMortalityCount: "",
  ratePerKg: "",
  rateType: "LIVE",
  transportCharge: "",
  commissionCharge: "",
  otherDeduction: "",
  paymentReceivedAmount: "",
  paymentStatus: "PENDING",
  status: "CONFIRMED",
  notes: "",
};

const STATUS_MESSAGE_TIMEOUT_MS = 4000;

interface SalesEntryScreenProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onSaved?: () => void;
}

export function SalesEntryScreen({ title = "Sales Entry", subtitle, onBack, onSaved }: SalesEntryScreenProps) {
  const { accessToken, user } = useAuth();
  const { batchId: routeBatchId } = useLocalSearchParams<{ batchId?: string }>();
  const initialBatchId = typeof routeBatchId === "string" ? routeBatchId : "";
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [traders, setTraders] = useState<ApiTrader[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [showRestoredMessage, setShowRestoredMessage] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    setError,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SalesEntryFormData>({
    resolver: zodResolver(salesEntrySchema),
    defaultValues: {
      ...SALES_ENTRY_DEFAULTS,
      batchId: initialBatchId,
    },
  });
  const { clearPersistedData, isRestored } = useFormPersistence(
    `form_draft_sales_entry_${initialBatchId || "new"}`,
    watch,
    reset,
    {
      ...SALES_ENTRY_DEFAULTS,
      batchId: initialBatchId,
    },
  );
  const initialBatchAppliedRef = React.useRef(false);

  const selectedBatchId = watch("batchId");
  const selectedTraderId = watch("traderId");
  const birdCount = watch("birdCount");
  const totalWeightKg = watch("totalWeightKg");
  const ratePerKg = watch("ratePerKg");
  const rateType = watch("rateType");
  const transportCharge = watch("transportCharge");
  const commissionCharge = watch("commissionCharge");
  const otherDeduction = watch("otherDeduction");
  const paymentStatus = watch("paymentStatus");
  const saleStatus = watch("status");
  const canUseLiveRate = user?.role === "OWNER";

  const activeBatches = useMemo(
    () =>
      batches.filter(
        (batch) =>
          batch.status === "ACTIVE" ||
          batch.status === "SALES_RUNNING" ||
          batch.id === initialBatchId,
      ),
    [batches, initialBatchId]
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

  const netAmount = useMemo(() => {
    const transport = parseNumberInput(transportCharge ?? "") || 0;
    const commission = parseNumberInput(commissionCharge ?? "") || 0;
    const deduction = parseNumberInput(otherDeduction ?? "") || 0;
    return Math.max(totalAmount - transport - commission - deduction, 0);
  }, [commissionCharge, otherDeduction, totalAmount, transportCharge]);

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
      const currentBatchId = getValues("batchId");
      if (initialBatchId && !initialBatchAppliedRef.current) {
        initialBatchAppliedRef.current = true;
        setValue("batchId", initialBatchId, { shouldDirty: false, shouldValidate: true });
      } else if (firstActiveId && !currentBatchId) {
        setValue("batchId", firstActiveId);
      }
    } catch (error) {
      showRequestErrorToast(error, { title: "Unable to load data" });
    }
  }, [accessToken, getValues, initialBatchId, setValue]);

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
      const transport = parseNumberInput(data.transportCharge ?? "") || 0;
      const commission = parseNumberInput(data.commissionCharge ?? "") || 0;
      const deduction = parseNumberInput(data.otherDeduction ?? "") || 0;
      const net = Math.max(total - transport - commission - deduction, 0);
      const payload = {
        traderId: data.traderId,
        saleDate: data.saleDate,
        vehicleNumber: data.vehicleNumber?.trim() || undefined,
        birdCount: qty,
        totalWeightKg: totalWeight,
        averageWeightKg: weight,
        loadingMortalityCount: parseNumberInput(data.loadingMortalityCount ?? ""),
        ratePerKg: rate,
        grossAmount: total,
        transportCharge: transport,
        commissionCharge: commission,
        otherDeduction: deduction,
        netAmount: net,
        paymentReceivedAmount: parseNumberInput(data.paymentReceivedAmount ?? ""),
        paymentStatus: data.paymentStatus,
        status: data.status,
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
        onSaved?.();
        return;
      }

      await createSale(accessToken, data.batchId, payload);
      showSuccessToast("Sales entry saved successfully.");
      setSavedMessage("Sales entry saved successfully.");
      await clearPersistedData();
      reset({ ...SALES_ENTRY_DEFAULTS, batchId: data.batchId });
      onSaved?.();
    } catch (error) {
      showRequestErrorToast(error, { title: "Save failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title={title}
        subtitle={subtitle}
        onBack={onBack}
      />
      <KeyboardAwareScrollView
        style={styles.contentContainer}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
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

            {/* Card 1: Sale Information */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Sale Information</Text>
                <View style={styles.sectionDivider} />
              </View>

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
                required
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
                required
              />

              {/* Vehicle Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vehicle Number</Text>
                <Controller
                  control={control}
                  name="vehicleNumber"
                  render={({ field: { value, onChange } }) => (
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Vehicle number"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="characters"
                    />
                  )}
                />
              </View>
            </View>

            {/* Card 2: Shipment Details */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Shipment Details</Text>
                <View style={styles.sectionDivider} />
              </View>

              {/* Quantity Sold */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Quantity Sold <Text style={styles.required}>*</Text></Text>
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

              {/* Loading Mortality */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Loading Mortality</Text>
                <Controller
                  control={control}
                  name="loadingMortalityCount"
                  render={({ field: { value, onChange } }) => (
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                    />
                  )}
                />
                {errors.loadingMortalityCount && <Text style={styles.errorText}>{errors.loadingMortalityCount.message}</Text>}
              </View>

              {/* Total Weight */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Total Weight (kg) <Text style={styles.required}>*</Text></Text>
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
            </View>

            {/* Card 3: Pricing & Settlement */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pricing & Settlement</Text>
                <View style={styles.sectionDivider} />
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
                  {canUseLiveRate && rateType === "LIVE" ? "Live Rate" : "Dressed Rate"} (₹ / kg) <Text style={styles.required}>*</Text>
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

              {/* Transport Charge */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Transport Charge</Text>
                <Controller
                  control={control}
                  name="transportCharge"
                  render={({ field: { value, onChange } }) => (
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                    />
                  )}
                />
                {errors.transportCharge && <Text style={styles.errorText}>{errors.transportCharge.message}</Text>}
              </View>

              {/* Commission Charge */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Commission Charge</Text>
                <Controller
                  control={control}
                  name="commissionCharge"
                  render={({ field: { value, onChange } }) => (
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                    />
                  )}
                />
                {errors.commissionCharge && <Text style={styles.errorText}>{errors.commissionCharge.message}</Text>}
              </View>

              {/* Other Deduction */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Other Deduction</Text>
                <Controller
                  control={control}
                  name="otherDeduction"
                  render={({ field: { value, onChange } }) => (
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                    />
                  )}
                />
                {errors.otherDeduction && <Text style={styles.errorText}>{errors.otherDeduction.message}</Text>}
              </View>

              {/* Payment Received */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Payment Received</Text>
                <Controller
                  control={control}
                  name="paymentReceivedAmount"
                  render={({ field: { value, onChange } }) => (
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                    />
                  )}
                />
                {errors.paymentReceivedAmount && <Text style={styles.errorText}>{errors.paymentReceivedAmount.message}</Text>}
              </View>

              {/* Payment Status */}
              <SearchableSelectField
                label="Payment Status"
                value={paymentStatus}
                options={[
                  { label: "Pending", value: "PENDING" },
                  { label: "Partial", value: "PARTIAL" },
                  { label: "Paid", value: "PAID" },
                  { label: "Cancelled", value: "CANCELLED" },
                ]}
                onSelect={(value) => setValue("paymentStatus", value as ApiTransactionPaymentStatus, { shouldDirty: true, shouldValidate: true })}
                placeholder="Select Payment Status"
                searchPlaceholder="Search payment status"
                emptyMessage="No matching status"
                error={errors.paymentStatus?.message}
                required
              />

              {/* Sale Status */}
              <SearchableSelectField
                label="Sale Status"
                value={saleStatus}
                options={[
                  { label: "Confirmed", value: "CONFIRMED" },
                  { label: "Draft", value: "DRAFT" },
                  { label: "Cancelled", value: "CANCELLED" },
                ]}
                onSelect={(value) => setValue("status", value as ApiSaleStatus, { shouldDirty: true, shouldValidate: true })}
                placeholder="Select Sale Status"
                searchPlaceholder="Search sale status"
                emptyMessage="No matching status"
                error={errors.status?.message}
                required
              />

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
                      scrollEnabled={false}
                    />
                  )}
                />
              </View>

              {/* Gross & Net Amount Combined Summary Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryColumn}>
                    <Text style={styles.summaryLabel}>Gross Amount</Text>
                    <Text style={styles.summaryGrossValue}>₹ {totalAmount.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.summaryDividerVertical} />
                  <View style={styles.summaryColumn}>
                    <Text style={styles.summaryLabel}>Net Amount</Text>
                    <Text style={styles.summaryNetValue}>₹ {netAmount.toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.btnDisabled]}
                onPress={handleSubmit(onSubmit)}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="save-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>Save Sales Entry</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
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
  contentContainer: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#F4F6F8",
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 80,
  },
  form: {
    flex: 1,
  },
  stateSpacing: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 8,
    marginBottom: 16,
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
  required: {
    color: "#EF4444",
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
  totalCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CDEBDD",
    backgroundColor: "#F0FBF5",
    padding: 14,
    marginBottom: 20,
  },
  totalCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  totalLabel: {
    color: "#212B36",
    fontSize: 13,
    fontWeight: "900",
  },
  totalIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  totalAmount: {
    color: "#0B5C36",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 12,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  paymentStatusContainer: {
    flexDirection: "column",
  },
  paymentStatusRow: {
    flexDirection: "row",
    gap: 10,
  },
  paymentStatusCard2Col: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  paymentStatusCardActive: {
    backgroundColor: "#0B5C36",
    borderColor: "#0B5C36",
  },
  paymentStatusPaid: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  paymentStatusCancelled: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  paymentStatusPartial: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#374151",
    flexShrink: 1,
  },
  paymentStatusTextActive: {
    color: "#FFFFFF",
  },
  statusChip: {
    flexGrow: 1,
    minWidth: 92,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  statusChipActive: {
    borderColor: "#0B5C36",
    backgroundColor: "#E8F5E9",
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
  },
  statusChipTextActive: {
    color: "#0B5C36",
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
  summaryCard: {
    backgroundColor: "#0B5C36",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#0B5C36",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryColumn: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    color: "#A7F3D0",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryGrossValue: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
  },
  summaryNetValue: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "900",
  },
  summaryDividerVertical: {
    width: 1.5,
    height: 32,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    marginHorizontal: 8,
  },
});
