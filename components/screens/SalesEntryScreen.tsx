import { useAuth } from "@/context/AuthContext";
import {
  ApiBatch,
  ApiTrader,
  createSale,
  listAllBatches,
  listAllTraders,
} from "@/services/managementApi";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, {
  useCallback,
  useMemo,
  useState
} from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TopAppBar } from "@/components/ui/TopAppBar";
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
  const next = Number(value.replace(/,/g, ''));
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

const numericField = (label: string) =>
  z.string().min(1, `${label} is required`).refine((value) => !Number.isNaN(Number(value.replace(/,/g, ''))), {
    message: `${label} must be a number`,
  });

const salesEntrySchema = z.object({
  batchId: z.string().min(1, "Please select a batch"),
  traderId: z.string().min(1, "Please select a customer"),
  saleDate: z.string().min(1, "Date is required"),
  birdCount: numericField("Quantity sold"),
  averageWeightKg: numericField("Average weight"),
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
  averageWeightKg: "",
  ratePerKg: "",
  rateType: "LIVE",
  notes: "",
};

interface SalesEntryScreenProps {
  title?: string;
  subtitle?: string;
}

export function SalesEntryScreen({ title = "Sales Entry", subtitle }: SalesEntryScreenProps) {
  const { accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [traders, setTraders] = useState<ApiTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);
  const [traderDropdownOpen, setTraderDropdownOpen] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SalesEntryFormData>({
    resolver: zodResolver(salesEntrySchema),
    defaultValues: SALES_ENTRY_DEFAULTS,
  });

  const selectedBatchId = watch("batchId");
  const selectedTraderId = watch("traderId");
  const birdCount = watch("birdCount");
  const averageWeightKg = watch("averageWeightKg");
  const ratePerKg = watch("ratePerKg");
  const rateType = watch("rateType");

  const activeBatches = useMemo(
    () => batches.filter((batch) => batch.status === "ACTIVE" || batch.status === "SALES_RUNNING"),
    [batches]
  );

  const selectedBatch = batches.find((b) => b.id === selectedBatchId) ?? null;
  const selectedTrader = traders.find((t) => t.id === selectedTraderId) ?? null;

  const totalAmount = useMemo(() => {
    const qty = Number(birdCount.replace(/,/g, '')) || 0;
    const weight = Number(averageWeightKg) || 0;
    const rate = Number(ratePerKg) || 0;
    return qty * weight * rate;
  }, [birdCount, averageWeightKg, ratePerKg]);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedBatchId, setValue]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const onSubmit = async (data: SalesEntryFormData) => {
    if (!accessToken) return;
    setSubmitting(true);
    try {
      const qty = Number(data.birdCount.replace(/,/g, ''));
      const weight = Number(data.averageWeightKg);
      const rate = Number(data.ratePerKg);
      const total = qty * weight * rate;

      await createSale(accessToken, data.batchId, {
        traderId: data.traderId,
        saleDate: data.saleDate,
        birdCount: qty,
        averageWeightKg: weight,
        ratePerKg: rate,
        grossAmount: total,
        netAmount: total,
        notes: data.notes?.trim() || undefined,
        clientReferenceId: `sale-${Date.now()}`,
      });
      showSuccessToast("Sales entry saved successfully.");
      reset({ ...SALES_ENTRY_DEFAULTS, batchId: data.batchId });
    } catch (error) {
      showRequestErrorToast(error, { title: "Save failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <TopAppBar title={title} subtitle={subtitle} />

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
              name="saleDate"
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
              <Ionicons name="chevron-down" size={20} color="#E5E7EB" />
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
                    <Text style={styles.dropdownItemText}>{batch.code} ({batch.farmName})</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {errors.batchId && <Text style={styles.errorText}>{errors.batchId.message}</Text>}
          </View>

          {/* Customer / Buyer */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Customer / Buyer</Text>
            <TouchableOpacity
              style={styles.inputMock}
              activeOpacity={0.7}
              onPress={() => setTraderDropdownOpen(!traderDropdownOpen)}
            >
              <Text style={styles.inputValue}>{selectedTrader?.name || "Select Customer"}</Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
            {traderDropdownOpen && (
              <View style={styles.dropdownList}>
                {traders.map((trader) => (
                  <TouchableOpacity
                    key={trader.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setValue("traderId", trader.id);
                      setTraderDropdownOpen(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{trader.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {errors.traderId && <Text style={styles.errorText}>{errors.traderId.message}</Text>}
          </View>

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

          {/* Average Weight */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Average Weight (kg)</Text>
            <Controller
              control={control}
              name="averageWeightKg"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  placeholder="2.150"
                  placeholderTextColor="#9CA3AF"
                />
              )}
            />
            {errors.averageWeightKg && <Text style={styles.errorText}>{errors.averageWeightKg.message}</Text>}
          </View>

          {/* Rate Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Rate Type</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleBtn, rateType === 'LIVE' && styles.toggleBtnActive]}
                onPress={() => setValue("rateType", "LIVE")}
              >
                <Text style={[styles.toggleBtnText, rateType === 'LIVE' && styles.toggleBtnTextActive]}>Live Rate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, rateType === 'DRESSED' && styles.toggleBtnActive]}
                onPress={() => setValue("rateType", "DRESSED")}
              >
                <Text style={[styles.toggleBtnText, rateType === 'DRESSED' && styles.toggleBtnTextActive]}>Dressed Rate</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Rate */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{rateType === 'LIVE' ? 'Live Rate' : 'Dressed Rate'} (₹ / kg)</Text>
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
    </SafeAreaView>
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
