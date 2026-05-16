import { useAuth } from "@/context/AuthContext";
import {
  ApiBatch,
  ApiDailyLog,
  createDailyLog,
  listAllBatches,
  listDailyLogs,
  updateDailyLog,
} from "@/services/managementApi";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
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
import { SafeAreaView } from "react-native-safe-area-context";

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

function toOptionalNumber(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return undefined;
  const next = Number(normalized);
  return Number.isNaN(next) ? undefined : next;
}

const optionalNumericField = (label: string) =>
  z.string().optional().refine((value) => !value || !Number.isNaN(Number(value.replace(/,/g, ""))), {
    message: `${label} must be a number`,
  });

const dailyEntrySchema = z.object({
  batchId: z.string().min(1, "Please select a batch"),
  logDate: z.string().min(1, "Date is required"),
  openingBirdCount: optionalNumericField("Opening bird count"),
  mortalityCount: optionalNumericField("Mortality"),
  cullCount: optionalNumericField("Cull"),
  feedConsumedKg: optionalNumericField("Feed consumed"),
  waterConsumedLtr: optionalNumericField("Water consumed"),
  avgWeightGrams: optionalNumericField("Average weight"),
  notes: z.string().optional(),
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

type DailyEntryScreenProps = {
  title?: string;
  subtitle?: string;
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

function buildDailyLogPayload(data: DailyEntryFormData) {
  return {
    logDate: data.logDate,
    openingBirdCount: toOptionalNumber(data.openingBirdCount ?? ""),
    mortalityCount: toOptionalNumber(data.mortalityCount ?? ""),
    cullCount: toOptionalNumber(data.cullCount ?? ""),
    feedConsumedKg: toOptionalNumber(data.feedConsumedKg ?? ""),
    waterConsumedLtr: toOptionalNumber(data.waterConsumedLtr ?? ""),
    avgWeightGrams: toOptionalNumber(data.avgWeightGrams ?? ""),
    notes: data.notes?.trim() || undefined,
  };
}

export function DailyEntryScreen({ title = "Daily Entry", subtitle }: DailyEntryScreenProps) {
  const router = useRouter();
  const { batchId: routeBatchId, dailyLogId } = useLocalSearchParams<{
    batchId?: string;
    dailyLogId?: string;
  }>();
  const { accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLog, setLoadingLog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
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
  const isEditMode = typeof dailyLogId === "string" && dailyLogId.length > 0;
  const lockedBatchId =
    typeof routeBatchId === "string" && routeBatchId.length > 0 ? routeBatchId : null;
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
  const selectedBatch = batches.find((b) => b.id === selectedBatchId) ?? null;

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
      const payload = buildDailyLogPayload(data);
      const clientReferenceId = `daily-${Date.now()}`;

      if (!(await isNetworkConnected())) {
        if (isEditMode && typeof dailyLogId === "string") {
          await enqueueOfflineSubmission({
            type: "daily-entry-update",
            payload: { batchId: data.batchId, dailyLogId, body: payload },
          });
        } else {
          await enqueueOfflineSubmission({
            type: "daily-entry",
            payload: {
              batchId: data.batchId,
              body: { ...payload, clientReferenceId },
            },
          });
        }

        await clearPersistedData();
        showSuccessToast("Saved offline. It will sync automatically.");
        setSavedMessage("Saved offline. It will sync when internet returns.");
        reset({ ...DAILY_ENTRY_DEFAULTS, batchId: data.batchId });
        return;
      }

      if (isEditMode && typeof dailyLogId === "string") {
        await updateDailyLog(accessToken, data.batchId, dailyLogId, payload);
        showSuccessToast("Daily log updated successfully.");
        setSavedMessage("Daily log updated successfully.");
        await clearPersistedData();
        router.back();
      } else {
        await createDailyLog(accessToken, data.batchId, {
          ...payload,
          clientReferenceId,
        });
        showSuccessToast("Daily log saved successfully.");
        setSavedMessage("Daily log saved successfully.");
        await clearPersistedData();
        reset({ ...DAILY_ENTRY_DEFAULTS, batchId: data.batchId });
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
          {isRestored ? (
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
          {/* Date */}
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

          {/* Farm */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Farm</Text>
            <View style={styles.inputMock}>
              <Text style={styles.inputValue}>{selectedBatch?.farmName || "Select Farm"}</Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </View>
          </View>

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

          {/* Opening Bird Count */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Opening Bird Count</Text>
            <Controller
              control={control}
              name="openingBirdCount"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  placeholder="2480"
                  placeholderTextColor="#9CA3AF"
                />
              )}
            />
            {errors.openingBirdCount && (
              <Text style={styles.errorText}>{errors.openingBirdCount.message}</Text>
            )}
          </View>

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
                  placeholder="32"
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
                  placeholder="3"
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
                  placeholder="420"
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
                  placeholder="1,250"
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
                  placeholder="2350"
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
            <Text style={styles.label}>Remarks (Optional)</Text>
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
});
