import { Ionicons } from "@expo/vector-icons";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { ScreenState } from "@/components/ui/ScreenState";
import { SearchableSelectField } from "@/components/ui/SearchableSelectField";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { useAuth } from "@/context/AuthContext";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { getLocalDateValue } from "@/services/dateUtils";
import {
  ApiBatch,
  ApiDailyLog,
  CreateDailyLogRequest,
  UpdateDailyLogRequest,
  createDailyLog,
  listAllBatches,
  listDailyLogs,
  updateDailyLog,
} from "@/services/managementApi";
import { enqueueOfflineSubmission, isNetworkConnected } from "@/services/offlineSyncQueue";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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

function todayValue() {
  return getLocalDateValue();
}

function toOptionalNumber(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return undefined;
  const next = Number(normalized);
  return Number.isNaN(next) ? undefined : next;
}

const requiredNumericField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => !Number.isNaN(Number(value.replace(/,/g, ""))), {
      message: `${label} must be a number`,
    });

const optionalNumericField = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || !Number.isNaN(Number(value.replace(/,/g, ""))), {
      message: `${label} must be a number`,
    });

const dailyEntrySchema = z.object({
  batchId: z.string().min(1, "Please select a batch"),
  logDate: z.string().min(1, "Date is required"),
  openingBirdCount: requiredNumericField("Opening bird count"),
  mortalityCount: optionalNumericField("Mortality"),
  cullCount: optionalNumericField("Cull"),
  feedConsumedKg: optionalNumericField("Feed consumed"),
  waterConsumedLtr: optionalNumericField("Water consumed"),
  avgWeightGrams: optionalNumericField("Average weight"),
  notes: z.string().trim(),
});

type DailyEntryFormData = z.infer<typeof dailyEntrySchema>;

const DAILY_ENTRY_DEFAULTS = {
  batchId: "",
  logDate: todayValue(),
  openingBirdCount: "",
  mortalityCount: "",
  cullCount: "",
  feedConsumedKg: "",
  waterConsumedLtr: "",
  avgWeightGrams: "",
  notes: "",
};

const RESTORED_MESSAGE_TIMEOUT_MS = 4000;

type DailyEntryScreenProps = {
  title?: string;
  subtitle?: string;
  listPath?: string;
};

function toStringValue(value?: number | null) {
  return value === undefined || value === null ? "" : String(value);
}

function toFormValues(log: ApiDailyLog): DailyEntryFormData {
  return {
    batchId: log.batchId,
    logDate: log.logDate,
    openingBirdCount: toStringValue(log.openingBirdCount),
    mortalityCount: toStringValue(log.mortalityCount),
    cullCount: toStringValue(log.cullCount),
    feedConsumedKg: toStringValue(log.feedConsumedKg),
    waterConsumedLtr: toStringValue(log.waterConsumedLtr),
    avgWeightGrams: toStringValue(log.avgWeightGrams),
    notes: log.notes ?? "",
  };
}

function buildDailyLogPayload(
  data: DailyEntryFormData,
  clientReferenceId: string,
): CreateDailyLogRequest {
  return {
    logDate: data.logDate,
    openingBirdCount: toOptionalNumber(data.openingBirdCount ?? ""),
    mortalityCount: toOptionalNumber(data.mortalityCount ?? ""),
    cullCount: toOptionalNumber(data.cullCount ?? ""),
    feedConsumedKg: toOptionalNumber(data.feedConsumedKg ?? ""),
    waterConsumedLtr: toOptionalNumber(data.waterConsumedLtr ?? ""),
    avgWeightGrams: toOptionalNumber(data.avgWeightGrams ?? ""),
    notes: data.notes.trim() || undefined,
    clientReferenceId,
  };
}

function buildDailyLogUpdatePayload(payload: CreateDailyLogRequest): UpdateDailyLogRequest {
  const {
    clientReferenceId: _clientReferenceId,
    logDate: _logDate,
    ...updatePayload
  } = payload;
  return updatePayload;
}

export function DailyEntryScreen({
  title = "Daily Entry",
  subtitle,
  listPath = "/(owner)/manage/daily-entry",
}: DailyEntryScreenProps) {
  const router = useRouter();
  const { batchId: routeBatchId, dailyLogId, returnTo } = useLocalSearchParams<{
    batchId?: string;
    dailyLogId?: string;
    returnTo?: string;
  }>();
  const { accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLog, setLoadingLog] = useState(false);
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
  } = useForm<DailyEntryFormData>({
    resolver: zodResolver(dailyEntrySchema),
    defaultValues: {
      ...DAILY_ENTRY_DEFAULTS,
      batchId: typeof routeBatchId === "string" ? routeBatchId : "",
    },
  });
  const { clearPersistedData, isRestored } = useFormPersistence(
    `form_draft_daily_entry_${typeof routeBatchId === "string" ? routeBatchId : "new"}`,
    watch,
    reset,
    {
      ...DAILY_ENTRY_DEFAULTS,
      batchId: typeof routeBatchId === "string" ? routeBatchId : "",
    },
  );

  const selectedBatchId = watch("batchId");
  const openingBirdCountValue = watch("openingBirdCount");
  const isEditMode = typeof dailyLogId === "string" && dailyLogId.length > 0;
  const submitRedirectPath = typeof returnTo === "string" && returnTo.length > 0 ? returnTo : listPath;
  const lockedBatchId =
    typeof routeBatchId === "string" && routeBatchId.length > 0 ? routeBatchId : null;

  useEffect(() => {
    if (!isEditMode && selectedBatchId && batches.length > 0) {
      const selectedBatch = batches.find((b) => b.id === selectedBatchId);
      if (selectedBatch) {
        const count = selectedBatch.summary?.liveBirds ?? selectedBatch.placementCount ?? 0;
        setValue("openingBirdCount", String(count), {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    }
  }, [selectedBatchId, batches, isEditMode, setValue]);

  const activeBatches = useMemo(
    () => batches.filter((batch) => batch.status === "ACTIVE" || batch.id === lockedBatchId),
    [batches, lockedBatchId]
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

  useEffect(() => {
    if (!isRestored) {
      setShowRestoredMessage(false);
      return;
    }

    setShowRestoredMessage(true);
  }, [isRestored]);

  useEffect(() => {
    if (!showRestoredMessage) return;

    const timeoutId = setTimeout(() => {
      setShowRestoredMessage(false);
    }, RESTORED_MESSAGE_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [showRestoredMessage]);

  useEffect(() => {
    if (lockedBatchId && selectedBatchId !== lockedBatchId) {
      setValue("batchId", lockedBatchId);
    }
  }, [lockedBatchId, selectedBatchId, setValue]);

  const loadEntryForEdit = useCallback(async () => {
    if (!accessToken || !lockedBatchId || !dailyLogId) return;
    setLoadingLog(true);
    try {
      const response = await listDailyLogs(accessToken, lockedBatchId);
      const log = response.data.find((item) => item.id === dailyLogId);

      if (log) {
        reset(toFormValues(log));
      } else {
        showRequestErrorToast(new Error("Daily log not found."), {
          title: "Unable to load entry",
        });
      }
    } catch (error) {
      showRequestErrorToast(error, { title: "Unable to load entry" });
    } finally {
      setLoadingLog(false);
    }
  }, [accessToken, dailyLogId, lockedBatchId, reset]);

  useEffect(() => {
    if (isEditMode) {
      void loadEntryForEdit();
    }
  }, [isEditMode, loadEntryForEdit]);

  const loadBatches = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await listAllBatches(accessToken);
      setBatches(response.data);
      const firstActiveId = response.data.find((b) => b.status === "ACTIVE")?.id;
      if (lockedBatchId) {
        setValue("batchId", lockedBatchId);
      } else if (firstActiveId && !selectedBatchId) {
        setValue("batchId", firstActiveId);
      }
    } catch (error) {
      showRequestErrorToast(error, { title: "Unable to load batches" });
    } finally {
      setLoading(false);
    }
  }, [accessToken, lockedBatchId, selectedBatchId, setValue]);

  useFocusEffect(
    useCallback(() => {
      void loadBatches();
    }, [loadBatches])
  );

  const onSubmit = async (data: DailyEntryFormData) => {
    if (!accessToken || submitting) return;
    setSavedMessage(null);
    setSubmitting(true);
    try {
      const clientReferenceId = `daily-${Date.now()}`;
      const payload = buildDailyLogPayload(data, clientReferenceId);
      const updatePayload = buildDailyLogUpdatePayload(payload);

      if (!(await isNetworkConnected())) {
        if (isEditMode && typeof dailyLogId === "string") {
          await enqueueOfflineSubmission({
            type: "daily-entry-update",
            payload: { batchId: data.batchId, dailyLogId, body: updatePayload },
          });
        } else {
          await enqueueOfflineSubmission({
            type: "daily-entry",
            payload: {
              batchId: data.batchId,
              body: payload,
            },
          });
        }

        await clearPersistedData();
        showSuccessToast("Saved offline. It will sync automatically.");
        setSavedMessage("Saved offline. It will sync when internet returns.");
        reset({ ...DAILY_ENTRY_DEFAULTS, batchId: data.batchId });
        router.replace(submitRedirectPath as never);
        return;
      }

      if (isEditMode && typeof dailyLogId === "string") {
        await updateDailyLog(accessToken, data.batchId, dailyLogId, updatePayload);
        showSuccessToast("Daily log updated successfully.");
        setSavedMessage("Daily log updated successfully.");
        await clearPersistedData();
        router.replace(submitRedirectPath as never);
      } else {
        const existingLogs = await listDailyLogs(accessToken, data.batchId);
        const duplicateLog = existingLogs.data.find((log) => log.logDate === data.logDate);
        if (duplicateLog) {
          const message = "A daily entry already exists for this batch and date.";
          setError("logDate", { type: "validate", message });
          showRequestErrorToast(new Error(message), { title: "Duplicate daily entry" });
          return;
        }
        await createDailyLog(accessToken, data.batchId, payload);
        showSuccessToast("Daily log saved successfully.");
        setSavedMessage("Daily log saved successfully.");
        await clearPersistedData();
        reset({ ...DAILY_ENTRY_DEFAULTS, batchId: data.batchId });
        router.replace(submitRedirectPath as never);
      }
    } catch (error) {
      showRequestErrorToast(error, { title: "Save failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title={isEditMode ? "Edit Daily Entry" : title}
        subtitle={subtitle}
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
        <View style={styles.form}>
          {loading || loadingLog ? <ActivityIndicator color="#0B5C36" style={styles.formLoader} /> : null}
          {showRestoredMessage ? (
            <ScreenState
              title="Draft restored"
              message="Your unsaved daily entry was restored."
              compact
              style={styles.stateSpacing}
            />
          ) : null}
          {savedMessage ? (
            <ScreenState
              title={savedMessage}
              message="Form is ready for the next entry."
              compact
              style={styles.stateSpacing}
            />
          ) : null}
          {!isEditMode ? (
            <Controller
              control={control}
              name="logDate"
              render={({ field: { value, onChange } }) => (
                <DatePickerField
                  label="Date"
                  value={value}
                  onChange={onChange}
                  error={errors.logDate?.message}
                  disableFuture
                />
              )}
            />
          ) : null}

          {/* Batch */}
          <SearchableSelectField
            label="Batch"
            value={selectedBatchId}
            options={batchOptions}
            onSelect={(value) => setValue("batchId", value, { shouldDirty: true, shouldValidate: true })}
            placeholder="Select Batch"
            searchPlaceholder="Search batch or farm"
            emptyMessage="No active batches found"
            error={errors.batchId?.message}
            locked={Boolean(lockedBatchId)}
          />

          {openingBirdCountValue ? (
            <View style={styles.birdCountContainer}>
              <View style={styles.birdIconWrapper}>
                <Ionicons name="analytics" size={16} color="#0B5C36" />
              </View>
              <View style={styles.birdCountContent}>
                <Text style={styles.birdCountLabel}>Opening Bird Count</Text>
                <Text style={styles.birdCountValue}>
                  {Number(openingBirdCountValue).toLocaleString("en-IN")} Birds
                </Text>
              </View>
            </View>
          ) : null}

          {/* Mortality */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mortality (Today)</Text>
            <Controller
              control={control}
              name="mortalityCount"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  placeholder="Enter Mortality"
                  placeholderTextColor="#9CA3AF"
                />
              )}
            />
            {errors.mortalityCount && (
              <Text style={styles.errorText}>{errors.mortalityCount.message}</Text>
            )}
          </View>

          {/* Cull */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cull (Today)</Text>
            <Controller
              control={control}
              name="cullCount"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  placeholder="Enter Cull"
                  placeholderTextColor="#9CA3AF"
                />
              )}
            />
            {errors.cullCount && <Text style={styles.errorText}>{errors.cullCount.message}</Text>}
          </View>

          {/* Feed Consumption */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Feed Consumption (kg)</Text>
            <Controller
              control={control}
              name="feedConsumedKg"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  placeholder="Enter Feed Consumption"
                  placeholderTextColor="#9CA3AF"
                />
              )}
            />
            {errors.feedConsumedKg && (
              <Text style={styles.errorText}>{errors.feedConsumedKg.message}</Text>
            )}
          </View>

          {/* Water Consumption */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Water Consumption (L)</Text>
            <Controller
              control={control}
              name="waterConsumedLtr"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  placeholder="Enter Water Consumed"
                  placeholderTextColor="#9CA3AF"
                />
              )}
            />
            {errors.waterConsumedLtr && (
              <Text style={styles.errorText}>{errors.waterConsumedLtr.message}</Text>
            )}
          </View>

          {/* Average Weight */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Average Weight (g)</Text>
            <Controller
              control={control}
              name="avgWeightGrams"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  placeholder="Enter Average Weight"
                  placeholderTextColor="#9CA3AF"
                />
              )}
            />
            {errors.avgWeightGrams && (
              <Text style={styles.errorText}>{errors.avgWeightGrams.message}</Text>
            )}
          </View>

          {/* Remarks */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Remarks</Text>
            <Controller
              control={control}
              name="notes"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Birds healthy and active"
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              )}
            />
            {errors.notes && <Text style={styles.errorText}>{errors.notes.message}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.btnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>{isEditMode ? "Update Entry" : "Save Entry"}</Text>
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
  disabledInput: {
    backgroundColor: "#F3F4F6",
    color: "#6B7280",
  },
  textArea: {
    height: 100,
    paddingTop: 16,
    textAlignVertical: "top",
  },
  inputLocked: {
    backgroundColor: "#F9FAFB",
  },
  formLoader: {
    marginBottom: 16,
  },
  dateInputWrap: {
    flex: 1,
  },
  dateReadable: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 2,
  },
  dateInput: {
    fontSize: 15,
    color: "#111827",
    padding: 0,
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
  birdCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -8,
    marginBottom: 20,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    padding: 12,
    gap: 12,
  },
  birdIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  birdCountContent: {
    flex: 1,
  },
  birdCountLabel: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  birdCountValue: {
    fontSize: 16,
    color: "#0B5C36",
    fontWeight: "900",
    marginTop: 2,
  },
});
