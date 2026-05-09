import { Colors } from "@/constants/Colors";
import { Layout } from "@/constants/Layout";
import { useAuth } from "@/context/AuthContext";
import {
  ApiBatch,
  createDailyLog,
  listAllBatches,
} from "@/services/managementApi";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFormPersistence } from "@/hooks/useFormPersistence";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { getLocalDateValue } from "@/services/dateUtils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

type DailyEntryScreenProps = {
  title?: string;
  subtitle?: string;
};

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function todayValue() {
  return getLocalDateValue();
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromValue(value: string) {
  if (!isValidDateValue(value)) {
    return new Date();
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function monthFromValue(value: string) {
  const date = dateFromValue(value);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getCalendarCells(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmptyDays = firstDay.getDay();

  return [
    ...Array.from({ length: leadingEmptyDays }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) => new Date(year, month, index + 1),
    ),
  ];
}

function toOptionalNumber(value: string) {
  if (!value || value.trim() === "") return undefined;
  const next = Number(value);
  return Number.isNaN(next) ? undefined : next;
}

function isBlank(value?: string) {
  return !value || value.trim() === "";
}

function isValidDateValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isFutureDate(value: string) {
  return value > todayValue();
}

function batchLabel(batch: ApiBatch) {
  const farm = batch.farmName ? ` • ${batch.farmName}` : "";
  return `${batch.code}${farm}`;
}

const optionalNumericField = (
  label: string,
  options: { integer?: boolean } = {},
) =>
  z
    .string()
    .optional()
    .refine((value) => isBlank(value) || !Number.isNaN(Number(value)), {
      message: `${label} must be a number`,
    })
    .refine((value) => isBlank(value) || Number(value) >= 0, {
      message: `${label} cannot be negative`,
    })
    .refine(
      (value) =>
        isBlank(value) || !options.integer || Number.isInteger(Number(value)),
      {
        message: `${label} must be a whole number`,
      },
    );

const dailyEntrySchema = z
  .object({
    batchId: z.string().min(1, "Please select a batch"),
    logDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .refine(isValidDateValue, "Enter a valid date")
      .refine(
        (value) => !isFutureDate(value),
        "Log date cannot be in the future",
      ),
    openingBirdCount: optionalNumericField("Opening birds", { integer: true }),
    mortalityCount: optionalNumericField("Mortality", { integer: true }),
    cullCount: optionalNumericField("Cull count", { integer: true }),
    feedConsumedKg: optionalNumericField("Feed consumed"),
    waterConsumedLtr: optionalNumericField("Water consumed"),
    avgWeightGrams: optionalNumericField("Average weight"),
    notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
  })
  .superRefine((data, ctx) => {
    const hasAnyLogValue = [
      data.openingBirdCount,
      data.mortalityCount,
      data.cullCount,
      data.feedConsumedKg,
      data.waterConsumedLtr,
      data.avgWeightGrams,
    ].some((value) => !isBlank(value));

    if (!hasAnyLogValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fill at least one daily log field",
        path: ["openingBirdCount"],
      });
    }
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
} satisfies DailyEntryFormData;

export function DailyEntryScreen({
  title = "Daily Entry",
  subtitle = "Capture mortality, feed, water, and average weight for the active batch.",
}: DailyEntryScreenProps) {
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    monthFromValue(todayValue()),
  );

  const draftBannerOpacity = useRef(new Animated.Value(0)).current;

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors: formErrors },
  } = useForm<DailyEntryFormData>({
    resolver: zodResolver(dailyEntrySchema),
    defaultValues: DAILY_ENTRY_DEFAULTS,
    mode: "onTouched",
  });

  const { clearPersistedData, isRestored } = useFormPersistence(
    "form_draft_daily_entry",
    watch,
    reset,
    DAILY_ENTRY_DEFAULTS,
  );

  useEffect(() => {
    if (!isRestored) return;
    Animated.sequence([
      Animated.timing(draftBannerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(draftBannerOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isRestored, draftBannerOpacity]);

  const selectedBatchId = watch("batchId");
  const logDateValue = watch("logDate");
  const calendarCells = useMemo(
    () => getCalendarCells(calendarMonth),
    [calendarMonth],
  );
  const calendarTitle = calendarMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const openDatePicker = useCallback(() => {
    setCalendarMonth(monthFromValue(logDateValue));
    setShowDatePicker(true);
  }, [logDateValue]);

  const selectLogDate = useCallback(
    (date: Date) => {
      setValue("logDate", formatDateValue(date), {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      setShowDatePicker(false);
    },
    [setValue],
  );

  const activeBatches = useMemo(
    () =>
      batches.filter(
        (batch) =>
          batch.status === "ACTIVE" || batch.status === "READY_FOR_SALE",
      ),
    [batches],
  );

  const loadBatches = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    try {
      const response = await listAllBatches(accessToken);
      setBatches(response.data);

      const firstActiveId = response.data.find(
        (b) => b.status === "ACTIVE" || b.status === "READY_FOR_SALE",
      )?.id;
      if (firstActiveId && !selectedBatchId) {
        setValue("batchId", firstActiveId);
      }
    } catch (error) {
      console.warn("Failed to load batches for daily entry:", error);
      setMessage(
        showRequestErrorToast(error, {
          title: "Unable to load batches",
          fallbackMessage: "Could not load batches from backend.",
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedBatchId, setValue]);

  useFocusEffect(
    useCallback(() => {
      void loadBatches();
    }, [loadBatches]),
  );

  const selectedBatch =
    batches.find((batch) => batch.id === selectedBatchId) ?? null;

  const onSubmit = async (data: DailyEntryFormData) => {
    if (!accessToken || !data.batchId) {
      setMessage("Select a batch before submitting.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const created = await createDailyLog(accessToken, data.batchId, {
        logDate: data.logDate,
        openingBirdCount: toOptionalNumber(data.openingBirdCount ?? ""),
        mortalityCount: toOptionalNumber(data.mortalityCount ?? ""),
        cullCount: toOptionalNumber(data.cullCount ?? ""),
        feedConsumedKg: toOptionalNumber(data.feedConsumedKg ?? ""),
        waterConsumedLtr: toOptionalNumber(data.waterConsumedLtr ?? ""),
        avgWeightGrams: toOptionalNumber(data.avgWeightGrams ?? ""),
        notes: data.notes?.trim() || undefined,
        clientReferenceId: `daily-${Date.now()}`,
      });

      setMessage(`Saved daily log for ${created.logDate}.`);
      const nextValues = {
        ...data,
        mortalityCount: "",
        cullCount: "",
        feedConsumedKg: "",
        waterConsumedLtr: "",
        avgWeightGrams: "",
        notes: "",
      };
      reset(nextValues);
      await clearPersistedData();
      showSuccessToast("Daily log saved successfully.");
    } catch (error) {
      console.warn("Failed to create daily log:", error);
      setMessage(
        showRequestErrorToast(error, {
          title: "Daily log save failed",
          fallbackMessage: "Failed to save daily log.",
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSub}>{user?.role ?? "User"}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Draft restored banner */}
        <Animated.View
          style={[styles.draftBanner, { opacity: draftBannerOpacity }]}
          pointerEvents="none"
        >
          <Ionicons
            name="cloud-done-outline"
            size={16}
            color={Colors.primary}
          />
          <Text style={styles.draftBannerText}>Draft restored</Text>
        </Animated.View>

        <Text style={styles.pageTitle}>{subtitle}</Text>

        <View style={styles.noticeCard}>
          <Ionicons name="clipboard-outline" size={20} color={Colors.primary} />
          <Text style={styles.noticeText}>
            Daily logs are saved live to the backend and can be corrected later
            with the same batch.
          </Text>
        </View>

        <View style={styles.card}>
          <Controller
            control={control}
            name="batchId"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.sectionTitle}>Choose Batch</Text>
                {loading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator color={Colors.primary} />
                    <Text style={styles.loadingText}>
                      Loading active batches...
                    </Text>
                  </View>
                ) : activeBatches.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>
                      No active batches found for this account.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                  >
                    {activeBatches.map((batch) => {
                      const active = batch.id === value;
                      return (
                        <TouchableOpacity
                          key={batch.id}
                          style={[
                            styles.batchChip,
                            active && styles.batchChipActive,
                            formErrors.batchId && {
                              borderColor: Colors.tertiary,
                            },
                          ]}
                          onPress={() => onChange(batch.id)}
                        >
                          <Text
                            style={[
                              styles.batchChipText,
                              active && styles.batchChipTextActive,
                            ]}
                          >
                            {batchLabel(batch)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
                {formErrors.batchId && (
                  <Text style={styles.fieldErrorText}>
                    {formErrors.batchId.message}
                  </Text>
                )}
              </>
            )}
          />

          {selectedBatch && (
            <View style={styles.batchSummary}>
              <MaterialCommunityIcons
                name="layers-outline"
                size={18}
                color={Colors.primary}
              />
              <View style={styles.batchSummaryCopy}>
                <Text style={styles.batchSummaryTitle}>
                  {selectedBatch.code}
                </Text>
                <Text style={styles.batchSummarySub}>
                  {selectedBatch.farmName ?? "Farm"} •{" "}
                  {selectedBatch.placementCount.toLocaleString()} birds
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Daily Log</Text>
          <Controller
            control={control}
            name="logDate"
            render={({ field: { value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Log Date *</Text>
                <TouchableOpacity
                  style={[
                    styles.inputMock,
                    formErrors.logDate && { borderColor: Colors.tertiary },
                  ]}
                  onPress={openDatePicker}
                  activeOpacity={0.78}
                >
                  <Text
                    style={[styles.dateValue, !value && styles.datePlaceholder]}
                  >
                    {value || "YYYY-MM-DD"}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
                {formErrors.logDate && (
                  <Text style={styles.fieldErrorText}>
                    {formErrors.logDate.message}
                  </Text>
                )}
              </View>
            )}
          />
          <View style={styles.row}>
            <Controller
              control={control}
              name="openingBirdCount"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputGroup, styles.half]}>
                  <Text style={styles.label}>Opening Birds</Text>
                  <View
                    style={[
                      styles.inputMock,
                      formErrors.openingBirdCount && {
                        borderColor: Colors.tertiary,
                      },
                    ]}
                  >
                    <TextInput
                      style={styles.textInput}
                      value={value}
                      onChangeText={onChange}
                      placeholder={
                        selectedBatch
                          ? selectedBatch.placementCount.toString()
                          : "0"
                      }
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="numeric"
                    />
                    <MaterialCommunityIcons
                      name="bird"
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </View>
                  {formErrors.openingBirdCount && (
                    <Text style={styles.fieldErrorText}>
                      {formErrors.openingBirdCount.message}
                    </Text>
                  )}
                </View>
              )}
            />
            <Controller
              control={control}
              name="mortalityCount"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputGroup, styles.half]}>
                  <Text style={styles.label}>Mortality</Text>
                  <View
                    style={[
                      styles.inputMock,
                      formErrors.mortalityCount && {
                        borderColor: Colors.tertiary,
                      },
                    ]}
                  >
                    <TextInput
                      style={styles.textInput}
                      value={value}
                      onChangeText={onChange}
                      placeholder="0"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="numeric"
                    />
                    <MaterialCommunityIcons
                      name="skull-outline"
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </View>
                  {formErrors.mortalityCount && (
                    <Text style={styles.fieldErrorText}>
                      {formErrors.mortalityCount.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </View>
          <View style={styles.row}>
            <Controller
              control={control}
              name="cullCount"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputGroup, styles.half]}>
                  <Text style={styles.label}>Cull Count</Text>
                  <View
                    style={[
                      styles.inputMock,
                      formErrors.cullCount && { borderColor: Colors.tertiary },
                    ]}
                  >
                    <TextInput
                      style={styles.textInput}
                      value={value}
                      onChangeText={onChange}
                      placeholder="0"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="numeric"
                    />
                    <MaterialCommunityIcons
                      name="checkbox-marked-circle-outline"
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </View>
                  {formErrors.cullCount && (
                    <Text style={styles.fieldErrorText}>
                      {formErrors.cullCount.message}
                    </Text>
                  )}
                </View>
              )}
            />
            <Controller
              control={control}
              name="feedConsumedKg"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputGroup, styles.half]}>
                  <Text style={styles.label}>Feed Consumed (kg)</Text>
                  <View
                    style={[
                      styles.inputMock,
                      formErrors.feedConsumedKg && {
                        borderColor: Colors.tertiary,
                      },
                    ]}
                  >
                    <TextInput
                      style={styles.textInput}
                      value={value}
                      onChangeText={onChange}
                      placeholder="0.0"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                    <MaterialCommunityIcons
                      name="silverware-fork"
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </View>
                  {formErrors.feedConsumedKg && (
                    <Text style={styles.fieldErrorText}>
                      {formErrors.feedConsumedKg.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </View>
          <View style={styles.row}>
            <Controller
              control={control}
              name="waterConsumedLtr"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputGroup, styles.half]}>
                  <Text style={styles.label}>Water Consumed (ltr)</Text>
                  <View
                    style={[
                      styles.inputMock,
                      formErrors.waterConsumedLtr && {
                        borderColor: Colors.tertiary,
                      },
                    ]}
                  >
                    <TextInput
                      style={styles.textInput}
                      value={value}
                      onChangeText={onChange}
                      placeholder="0.0"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                    <MaterialCommunityIcons
                      name="water-outline"
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </View>
                  {formErrors.waterConsumedLtr && (
                    <Text style={styles.fieldErrorText}>
                      {formErrors.waterConsumedLtr.message}
                    </Text>
                  )}
                </View>
              )}
            />
            <Controller
              control={control}
              name="avgWeightGrams"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputGroup, styles.half]}>
                  <Text style={styles.label}>Avg Weight (grams)</Text>
                  <View
                    style={[
                      styles.inputMock,
                      formErrors.avgWeightGrams && {
                        borderColor: Colors.tertiary,
                      },
                    ]}
                  >
                    <TextInput
                      style={styles.textInput}
                      value={value}
                      onChangeText={onChange}
                      placeholder="0"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="numeric"
                    />
                    <MaterialCommunityIcons
                      name="scale"
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </View>
                  {formErrors.avgWeightGrams && (
                    <Text style={styles.fieldErrorText}>
                      {formErrors.avgWeightGrams.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </View>
          {/* Notes field */}
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <View
                  style={[
                    styles.inputMock,
                    styles.textArea,
                    formErrors.notes && { borderColor: Colors.tertiary },
                  ]}
                >
                  <TextInput
                    style={[styles.textInput, styles.multiLine]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Optional remarks"
                    placeholderTextColor={Colors.textSecondary}
                    multiline
                  />
                </View>
                {formErrors.notes && (
                  <Text style={styles.fieldErrorText}>
                    {formErrors.notes.message}
                  </Text>
                )}
              </View>
            )}
          />
        </View>

        {message ? (
          <View style={styles.messageBox}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={Colors.primary}
            />
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#FFF"
              />
              <Text style={styles.submitBtnText}>Submit Daily Log</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.calendarOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View
            style={styles.calendarSheet}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.calendarNavBtn}
                onPress={() =>
                  setCalendarMonth((current) => addMonths(current, -1))
                }
              >
                <Ionicons name="chevron-back" size={20} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>{calendarTitle}</Text>
              <TouchableOpacity
                style={styles.calendarNavBtn}
                onPress={() =>
                  setCalendarMonth((current) => addMonths(current, 1))
                }
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={Colors.text}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {WEEK_DAYS.map((day) => (
                <Text key={day} style={styles.weekDay}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarCells.map((date, index) => {
                const dateValue = date ? formatDateValue(date) : "";
                const isSelected = dateValue === logDateValue;
                const isToday = dateValue === todayValue();
                const disabled = date ? isFutureDate(dateValue) : true;

                return (
                  <TouchableOpacity
                    key={`${dateValue || "empty"}-${index}`}
                    style={[
                      styles.calendarDay,
                      disabled && styles.calendarDayDisabled,
                    ]}
                    onPress={() => date && !disabled && selectLogDate(date)}
                    disabled={disabled}
                    activeOpacity={0.78}
                  >
                    <View
                      style={[
                        styles.calendarDayInner,
                        isToday && styles.calendarDayToday,
                        isSelected && styles.calendarDaySelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          isSelected && styles.calendarDayTextSelected,
                          disabled && styles.calendarDayTextDisabled,
                        ]}
                      >
                        {date ? date.getDate() : ""}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  draftBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C8E6C9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  draftBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    marginRight: 14,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  container: {
    padding: Layout.screenPadding,
    paddingBottom: 100,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 14,
  },
  noticeCard: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C8E6C9",
    padding: 14,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    lineHeight: 18,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 12,
  },
  loadingBox: {
    minHeight: 72,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyBox: {
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipRow: {
    gap: 8,
    paddingBottom: 12,
  },
  batchChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#F9FAFB",
  },
  batchChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  batchChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
  },
  batchChipTextActive: {
    color: "#FFF",
  },
  batchSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  batchSummaryCopy: {
    flex: 1,
  },
  batchSummaryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
  },
  batchSummarySub: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  inputGroup: {
    marginBottom: 14,
  },
  row: {
    flexDirection: Layout.isSmallDevice ? "column" : "row",
    gap: 12,
  },
  half: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  inputMock: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
  },
  textArea: {
    minHeight: 84,
    alignItems: "flex-start",
    paddingTop: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  dateValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  datePlaceholder: {
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  multiLine: {
    minHeight: 56,
    textAlignVertical: "top",
  },
  messageBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#C8E6C9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  messageText: {
    flex: 1,
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "700",
  },
  submitBtn: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  submitBtnDisabled: {
    backgroundColor: "#9DB8A8",
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
  fieldErrorText: {
    color: Colors.tertiary,
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "center",
    padding: 20,
  },
  calendarSheet: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  calendarNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F6F8",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calendarTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: Colors.text,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayToday: {
    backgroundColor: "#E8F5E9",
  },
  calendarDaySelected: {
    backgroundColor: Colors.primary,
  },
  calendarDayDisabled: {
    opacity: 0.35,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
  },
  calendarDayTextSelected: {
    color: "#FFF",
  },
  calendarDayTextDisabled: {
    color: Colors.textSecondary,
  },
});
