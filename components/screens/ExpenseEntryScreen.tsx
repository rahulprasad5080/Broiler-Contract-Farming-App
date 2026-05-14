import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
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
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useAuth } from "@/context/AuthContext";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { getLocalDateValue } from "@/services/dateUtils";
import {
  createBatchExpense,
  listAllBatches,
  type ApiBatch,
  type ApiExpenseCategoryCode,
} from "@/services/managementApi";

const COMPANY_CATEGORIES = [
  "CHICKS",
  "FEED",
  "MEDICINE",
  "VACCINE",
  "TRANSPORT",
  "OFFICE_EXPENSE",
  "SUPERVISOR_EXPENSE",
  "OTHER_COMPANY",
];

const FARMER_CATEGORIES = [
  "ELECTRICITY",
  "COCO_PITH",
  "LABOUR",
  "WATER",
  "DIESEL",
  "SHED_MAINTENANCE",
  "REPAIRS",
  "MISCELLANEOUS",
  "OTHER_FARMER",
];

const PAYMENT_TYPES = ["Cash", "UPI", "Bank", "Credit"];

const expenseSchema = z.object({
  batchId: z.string().min(1, "Please select a batch"),
  ledger: z.enum(["COMPANY", "FARMER"]),
  category: z.string().min(1, "Select category"),
  totalAmount: z.string().min(1, "Amount is required"),
  expenseDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  paymentType: z.string(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

type ExpenseEntryScreenProps = {
  title?: string;
  subtitle?: string;
};

export function ExpenseEntryScreen({ title = "Expense Entry" }: ExpenseEntryScreenProps) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [farmDropdownOpen, setFarmDropdownOpen] = useState(false);
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      batchId: "",
      ledger: "COMPANY",
      category: "CHICKS",
      totalAmount: "",
      expenseDate: getLocalDateValue(),
      notes: "",
      paymentType: "Cash",
    },
  });

  const selectedLedger = watch("ledger");
  const selectedBatchId = watch("batchId");
  const selectedBatch = batches.find((b) => b.id === selectedBatchId) ?? null;
  const categories = selectedLedger === "COMPANY" ? COMPANY_CATEGORIES : FARMER_CATEGORIES;

  const loadBatches = useCallback(async () => {
    if (!accessToken) return;
    try {
      const response = await listAllBatches(accessToken);
      setBatches(response.data);
      const firstActive = response.data.find(b => b.status === "ACTIVE")?.id;
      if (firstActive && !selectedBatchId) setValue("batchId", firstActive);
    } catch (error) {
      showRequestErrorToast(error, { title: "Unable to load batches" });
    }
  }, [accessToken, selectedBatchId, setValue]);

  useFocusEffect(useCallback(() => { void loadBatches(); }, [loadBatches]));

  const onSubmit = async (data: ExpenseFormData) => {
    if (!accessToken) return;
    setSubmitting(true);
    try {
      await createBatchExpense(accessToken, data.batchId, {
        ledger: data.ledger,
        category: data.category as ApiExpenseCategoryCode,
        expenseDate: data.expenseDate,
        description: data.notes || data.category,
        totalAmount: Number(data.totalAmount),
        clientReferenceId: `expense-${Date.now()}`,
      });
      showSuccessToast("Expense saved successfully.");
      reset({ ...data, totalAmount: "", notes: "" });
    } catch (error) {
      showRequestErrorToast(error, { title: "Save failed" });
    } finally {
      setSubmitting(false);
    }
  };

  const formatReadableDate = (val: string) => {
    const d = new Date(val);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <View>
            <Ionicons name="notifications-outline" size={24} color="#FFF" />
            <View style={styles.notifDot} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          
          {/* Expense For Segmented Control */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Expense For</Text>
            <View style={styles.ledgerTabs}>
              <TouchableOpacity 
                style={[styles.ledgerTab, selectedLedger === "COMPANY" && styles.ledgerTabActive]}
                onPress={() => {
                  setValue("ledger", "COMPANY");
                  setValue("category", COMPANY_CATEGORIES[0]);
                }}
              >
                <Text style={[styles.ledgerTabText, selectedLedger === "COMPANY" && styles.ledgerTabTextActive]}>Company Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.ledgerTab, selectedLedger === "FARMER" && styles.ledgerTabActive]}
                onPress={() => {
                  setValue("ledger", "FARMER");
                  setValue("category", FARMER_CATEGORIES[0]);
                }}
              >
                <Text style={[styles.ledgerTabText, selectedLedger === "FARMER" && styles.ledgerTabTextActive]}>Farmer Expense</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <Controller
              control={control}
              name="expenseDate"
              render={({ field: { value } }) => (
                <View style={styles.inputMock}>
                  <Text style={styles.inputValue}>{formatReadableDate(value)}</Text>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                </View>
              )}
            />
          </View>

          {/* Farm Select */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Farm</Text>
            <TouchableOpacity style={styles.inputMock} activeOpacity={0.7} onPress={() => setFarmDropdownOpen(!farmDropdownOpen)}>
              <Text style={styles.inputValue}>{selectedBatch?.farmName || "Select Farm"}</Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Batch Select */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Batch (Optional)</Text>
            <TouchableOpacity style={styles.inputMock} activeOpacity={0.7} onPress={() => setBatchDropdownOpen(!batchDropdownOpen)}>
              <Text style={styles.inputValue}>{selectedBatch?.code || "Select Batch"}</Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
            {batchDropdownOpen && (
              <View style={styles.dropdownList}>
                {batches.map((b) => (
                  <TouchableOpacity key={b.id} style={styles.dropdownItem} onPress={() => { setValue("batchId", b.id); setBatchDropdownOpen(false); }}>
                    <Text style={styles.dropdownItemText}>{b.code}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Expense Category Select */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Expense Category</Text>
            <TouchableOpacity style={styles.inputMock} activeOpacity={0.7} onPress={() => setCategoryDropdownOpen(!categoryDropdownOpen)}>
              <Text style={styles.inputValue}>{watch("category")}</Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
            {categoryDropdownOpen && (
              <View style={styles.dropdownList}>
                {categories.map((c) => (
                  <TouchableOpacity key={c} style={styles.dropdownItem} onPress={() => { setValue("category", c); setCategoryDropdownOpen(false); }}>
                    <Text style={styles.dropdownItemText}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount (₹)</Text>
            <Controller
              control={control}
              name="totalAmount"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  placeholder="850"
                  placeholderTextColor="#9CA3AF"
                />
              )}
            />
          </View>

          {/* Payment Type Selection Chips */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payment Type</Text>
            <View style={styles.chipsRow}>
              <Controller
                control={control}
                name="paymentType"
                render={({ field: { value, onChange } }) => (
                  <>
                    {PAYMENT_TYPES.map((type) => (
                      <TouchableOpacity 
                        key={type} 
                        style={[styles.chip, value === type && styles.chipActive]}
                        onPress={() => onChange(type)}
                      >
                        <Text style={[styles.chipText, value === type && styles.chipTextActive]}>{type}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              />
            </View>
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
                  placeholder="May electricity bill"
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              )}
            />
          </View>

          {/* Bill Photo Upload Mockup */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bill Photo (Optional)</Text>
            <View style={styles.fileUploadBox}>
              <View style={styles.fileInfo}>
                <View style={styles.fileIconBox}>
                  <Ionicons name="image-outline" size={24} color="#0B5C36" />
                </View>
                <Text style={styles.fileName}>electricity_may.jpg</Text>
              </View>
              <TouchableOpacity>
                <Ionicons name="close" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={[styles.submitBtn, submitting && styles.btnDisabled]} onPress={handleSubmit(onSubmit)} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Save Expense</Text>}
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  header: {
    backgroundColor: "#0B5C36",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerBtn: { padding: 4 },
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "700", marginLeft: 12 },
  notifDot: {
    position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#EF4444", borderWidth: 1.5, borderColor: "#0B5C36",
  },
  scrollContainer: { flexGrow: 1, backgroundColor: "#FFF", paddingHorizontal: 20, paddingTop: 24 },
  form: { flex: 1 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 8 },
  ledgerTabs: {
    flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: 12, padding: 4, height: 52,
  },
  ledgerTab: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  ledgerTabActive: { backgroundColor: "#0B5C36" },
  ledgerTabText: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  ledgerTabTextActive: { color: "#FFF" },
  input: {
    backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: 16, height: 52, fontSize: 15, color: "#111827",
  },
  inputMock: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: 16, height: 52,
  },
  inputValue: { fontSize: 15, color: "#374151" },
  textArea: { height: 100, paddingTop: 16, textAlignVertical: "top" },
  chipsRow: { flexDirection: "row", gap: 10 },
  chip: {
    flex: 1, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB",
  },
  chipActive: { backgroundColor: "#0B5C36", borderColor: "#0B5C36" },
  chipText: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  chipTextActive: { color: "#FFF" },
  fileUploadBox: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFF",
  },
  fileInfo: { flexDirection: "row", alignItems: "center" },
  fileIconBox: {
    width: 40, height: 40, borderRadius: 8, backgroundColor: "#E7F5ED",
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  fileName: { fontSize: 14, color: "#111827", fontWeight: "500" },
  dropdownList: {
    marginTop: 4, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, overflow: "hidden",
    elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownItemText: { fontSize: 14, color: "#374151" },
  submitBtn: {
    backgroundColor: "#0B5C36", height: 56, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 24,
  },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  btnDisabled: { opacity: 0.7 },
});
