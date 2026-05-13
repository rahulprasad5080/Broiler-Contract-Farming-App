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
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFormPersistence } from "@/hooks/useFormPersistence";
import { HeaderNotificationButton } from "@/components/ui/HeaderNotificationButton";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { TopAppBar } from "@/components/ui/TopAppBar";
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

function todayValue() {
  return getLocalDateValue();
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

function formatReadableDate(value?: string | null) {
  if (!value) return "Select date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

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
    setShowDraftBanner(true);
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
    ]).start(() => setShowDraftBanner(false));
  }, [isRestored, draftBannerOpacity]);

  const selectedBatchId = watch("batchId");
  const logDateValue = watch("logDate");

  const activeBatches = useMemo(
    () =>
      batches.filter((batch) => batch.status === "ACTIVE"),
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

      const firstActiveId = response.data.find((b) => b.status === "ACTIVE")?.id;
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
  const completedMetricCount = [
    watch("openingBirdCount"),
    watch("mortalityCount"),
    watch("cullCount"),
    watch("feedConsumedKg"),
    watch("waterConsumedLtr"),
    watch("avgWeightGrams"),
  ].filter((value) => !isBlank(value)).length;

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
      <TopAppBar
        title={title ?? "Daily Entry"}
        subtitle={user?.role ?? "User"}
        showBack
        right={<HeaderNotificationButton tone="onPrimary" />}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {showDraftBanner ? (
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
        ) : null}

        <View style={styles.dailyHero}>
          <View style={styles.dailyHeroIcon}>
            <MaterialCommunityIcons
              name="clipboard-text-outline"
              size={22}
              color={Colors.primary}
            />
          </View>
          <View style={styles.dailyHeroCopy}>
            <Text style={styles.dailyHeroTitle}>Flock Daily Record</Text>
            <Text style={styles.dailyHeroMeta} numberOfLines={1}>
              {selectedBatch?.code ?? "Select batch"} | {formatReadableDate(logDateValue)}
            </Text>
            <Text style={styles.dailyHeroHint} numberOfLines={2}>
              {subtitle}
            </Text>
          </View>
          <View style={styles.dailyModePill}>
            <Text style={styles.dailyModeText}>{completedMetricCount}/6 filled</Text>
          </View>
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
                  <>
                    <TouchableOpacity
                      style={[
                        styles.batchDropdownTrigger,
                        batchDropdownOpen && styles.batchDropdownTriggerActive,
                        formErrors.batchId && { borderColor: Colors.tertiary },
                      ]}
                      onPress={() => setBatchDropdownOpen((current) => !current)}
                      activeOpacity={0.82}
                    >
                      <View style={styles.batchTriggerIcon}>
                        <MaterialCommunityIcons
                          name="layers-outline"
                          size={18}
                          color={Colors.primary}
                        />
                      </View>
                      <View style={styles.batchTriggerCopy}>
                        <Text
                          style={[
                            styles.batchTriggerValue,
                            !selectedBatch && styles.batchTriggerPlaceholder,
                          ]}
                        >
                          {selectedBatch?.code ?? "Select active batch"}
                        </Text>
                        <Text style={styles.batchTriggerMeta} numberOfLines={1}>
                          {selectedBatch
                            ? `${selectedBatch.farmName ?? "Farm"} | ${selectedBatch.placementCount.toLocaleString()} birds`
                            : `${activeBatches.length} available`}
                        </Text>
                      </View>
                      <Ionicons
                        name={batchDropdownOpen ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={Colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {batchDropdownOpen ? (
                      <View style={styles.batchDropdown}>
                        <FlatList
                          data={activeBatches}
                          keyExtractor={(batch) => batch.id}
                          style={styles.batchOptions}
                          nestedScrollEnabled
                          keyboardShouldPersistTaps="handled"
                          renderItem={({ item: batch }) => {
                            const active = batch.id === value;
                            return (
                              <TouchableOpacity
                                style={[
                                  styles.batchOption,
                                  active && styles.batchOptionActive,
                                ]}
                                onPress={() => {
                                  onChange(batch.id);
                                  setBatchDropdownOpen(false);
                                }}
                                activeOpacity={0.78}
                              >
                                <View
                                  style={[
                                    styles.batchOptionIcon,
                                    active && styles.batchOptionIconActive,
                                  ]}
                                >
                                  <MaterialCommunityIcons
                                    name="barn"
                                    size={18}
                                    color={
                                      active
                                        ? Colors.primary
                                        : Colors.textSecondary
                                    }
                                  />
                                </View>
                                <View style={styles.batchOptionCopy}>
                                  <Text
                                    style={[
                                      styles.batchOptionCode,
                                      active && styles.batchOptionCodeActive,
                                    ]}
                                  >
                                    {batch.code}
                                  </Text>
                                  <Text
                                    style={styles.batchOptionMeta}
                                    numberOfLines={1}
                                  >
                                    {batch.farmName ?? "Farm"} |{" "}
                                    {batch.placementCount.toLocaleString()} birds
                                  </Text>
                                </View>
                                {active ? (
                                  <Ionicons
                                    name="checkmark-circle"
                                    size={20}
                                    color={Colors.primary}
                                  />
                                ) : null}
                              </TouchableOpacity>
                            );
                          }}
                        />
                      </View>
                    ) : null}
                  </>
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
                  {selectedBatch.farmName ?? "Farm"} |{" "}
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
            render={({ field: { onChange, value } }) => (
              <DatePickerField
                label="Log Date *"
                value={value}
                onChange={onChange}
                placeholder="Select log date"
                error={formErrors.logDate?.message}
                disableFuture
              />
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
                      placeholder="0"
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F8F7",
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
  container: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 8,
    paddingBottom: 100,
  },
  dailyHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDEBE3",
    padding: 12,
    marginBottom: 10,
  },
  dailyHeroIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
  },
  dailyHeroCopy: {
    flex: 1,
  },
  dailyHeroTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  dailyHeroMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  dailyHeroHint: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  dailyModePill: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F8F3",
    borderWidth: 1,
    borderColor: "#CBE6D5",
  },
  dailyModeText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "900",
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
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8E5",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: Colors.text,
    marginBottom: 10,
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
  batchDropdownTrigger: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  batchDropdownTriggerActive: {
    borderColor: Colors.primary,
    backgroundColor: "#F6FBF7",
  },
  batchTriggerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
  },
  batchTriggerCopy: {
    flex: 1,
  },
  batchTriggerValue: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  batchTriggerPlaceholder: {
    color: Colors.textSecondary,
    fontWeight: "700",
  },
  batchTriggerMeta: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  batchDropdown: {
    borderWidth: 1,
    borderColor: "#D7E8DD",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 8,
    marginTop: 8,
    marginBottom: 8,
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  batchOptions: {
    maxHeight: 230,
  },
  batchOption: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 9,
    paddingHorizontal: 10,
    marginBottom: 5,
    backgroundColor: "#FFFFFF",
  },
  batchOptionActive: {
    backgroundColor: "#E8F5E9",
  },
  batchOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F3",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  batchOptionIconActive: {
    backgroundColor: "#FFFFFF",
    borderColor: Colors.primary,
  },
  batchOptionCopy: {
    flex: 1,
  },
  batchOptionCode: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  batchOptionCodeActive: {
    color: Colors.primary,
  },
  batchOptionMeta: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
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
    gap: 9,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
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
    marginBottom: 10,
  },
  row: {
    flexDirection: Layout.isSmallDevice ? "column" : "row",
    gap: 10,
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
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
  },
  textArea: {
    minHeight: 76,
    alignItems: "flex-start",
    paddingTop: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
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
    minHeight: 50,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
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
});
