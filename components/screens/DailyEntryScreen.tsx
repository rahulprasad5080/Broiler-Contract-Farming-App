import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import {
  ApiBatch,
  createDailyLog,
  listAllBatches,
} from "@/services/managementApi";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { getLocalDateValue } from "@/services/dateUtils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

function todayValue() {
  return getLocalDateValue();
}

function toOptionalNumber(value: string) {
  if (!value || value.trim() === "") return undefined;
  const next = Number(value);
  return Number.isNaN(next) ? undefined : next;
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

const optionalNumericField = (label: string) =>
  z.string().optional().refine((value) => !value || !Number.isNaN(Number(value)), {
    message: `${label} must be a number`,
  });

const dailyEntrySchema = z.object({
  batchId: z.string().min(1, "Please select a batch"),
  logDate: z.string().min(1, "Date is required"),
  mortalityCount: optionalNumericField("Mortality"),
  feedConsumedKg: optionalNumericField("Feed consumed"),
  waterConsumedLtr: optionalNumericField("Water consumed"),
  avgWeightGrams: optionalNumericField("Average weight"),
  notes: z.string().optional(),
});

type DailyEntryFormData = z.infer<typeof dailyEntrySchema>;

const DAILY_ENTRY_DEFAULTS = {
  batchId: "",
  logDate: todayValue(),
  mortalityCount: "",
  feedConsumedKg: "",
  waterConsumedLtr: "",
  avgWeightGrams: "",
  notes: "",
};

export function DailyEntryScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DailyEntryFormData>({
    resolver: zodResolver(dailyEntrySchema),
    defaultValues: DAILY_ENTRY_DEFAULTS,
  });

  const selectedBatchId = watch("batchId");
  const activeBatches = useMemo(
    () => batches.filter((batch) => batch.status === "ACTIVE"),
    [batches]
  );
  const selectedBatch = batches.find((b) => b.id === selectedBatchId) ?? null;

  const loadBatches = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await listAllBatches(accessToken);
      setBatches(response.data);
      const firstActiveId = response.data.find((b) => b.status === "ACTIVE")?.id;
      if (firstActiveId && !selectedBatchId) {
        setValue("batchId", firstActiveId);
      }
    } catch (error) {
      showRequestErrorToast(error, { title: "Unable to load batches" });
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedBatchId, setValue]);

  useFocusEffect(
    useCallback(() => {
      void loadBatches();
    }, [loadBatches])
  );

  const onSubmit = async (data: DailyEntryFormData) => {
    if (!accessToken) return;
    setSubmitting(true);
    try {
      await createDailyLog(accessToken, data.batchId, {
        logDate: data.logDate,
        mortalityCount: toOptionalNumber(data.mortalityCount ?? ""),
        feedConsumedKg: toOptionalNumber(data.feedConsumedKg ?? ""),
        waterConsumedLtr: toOptionalNumber(data.waterConsumedLtr ?? ""),
        avgWeightGrams: toOptionalNumber(data.avgWeightGrams ?? ""),
        notes: data.notes?.trim() || undefined,
        clientReferenceId: `daily-${Date.now()}`,
      });
      showSuccessToast("Daily log saved successfully.");
      reset({ ...DAILY_ENTRY_DEFAULTS, batchId: data.batchId });
    } catch (error) {
      showRequestErrorToast(error, { title: "Save failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B5C36" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daily Entry</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <View>
            <Ionicons name="notifications-outline" size={24} color="#FFF" />
            <View style={styles.notifDot} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          {/* Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <Controller
              control={control}
              name="logDate"
              render={({ field: { value } }) => (
                <View style={styles.inputMock}>
                  <Text style={styles.inputValue}>{formatReadableDate(value)}</Text>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                </View>
              )}
            />
          </View>

          {/* Farm */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Farm</Text>
            <View style={styles.inputMock}>
              <Text style={styles.inputValue}>{selectedBatch?.farmName || "Select Farm"}</Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </View>
          </View>

          {/* Batch */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Batch</Text>
            <TouchableOpacity 
              style={styles.inputMock} 
              activeOpacity={0.7}
              onPress={() => setBatchDropdownOpen(!batchDropdownOpen)}
            >
              <Text style={styles.inputValue}>{selectedBatch?.code || "Select Batch"}</Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
            {batchDropdownOpen && (
              <View style={styles.dropdownList}>
                {activeBatches.map((batch) => (
                  <TouchableOpacity 
                    key={batch.id} 
                    style={styles.dropdownItem}
                    onPress={() => {
                      setValue("batchId", batch.id);
                      setBatchDropdownOpen(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{batch.code}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {errors.batchId && <Text style={styles.errorText}>{errors.batchId.message}</Text>}
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
          </View>

          {/* Average Weight */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Average Weight (kg)</Text>
            <Controller
              control={control}
              name="avgWeightGrams"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  placeholder="1.320"
                  placeholderTextColor="#9CA3AF"
                />
              )}
            />
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
              <Text style={styles.submitBtnText}>Save Entry</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: "#0B5C36" 
  },
  header: {
    backgroundColor: "#0B5C36",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 12,
  },
  notifDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#0B5C36",
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
