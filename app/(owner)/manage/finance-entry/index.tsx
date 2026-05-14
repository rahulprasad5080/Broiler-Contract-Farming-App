import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import {
  createFinanceEntry,
  listFinanceEntries,
  type ApiFinanceEntry,
  type ApiFinanceEntryType,
  type ApiTransactionPaymentStatus,
} from "@/services/managementApi";
import { ScreenState } from "@/components/ui/ScreenState";
import { TopAppBar } from "@/components/ui/TopAppBar";

const ENTRY_TYPES: { key: ApiFinanceEntryType; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }[] = [
  { key: "INVESTMENT", label: "Investment", icon: "briefcase-outline" },
  { key: "OTHER_INCOME", label: "Other Income", icon: "cash-plus" },
  { key: "OTHER_EXPENSE", label: "Other Expense", icon: "cash-minus" },
];

const PAYMENT_STATUSES: ApiTransactionPaymentStatus[] = ["PENDING", "PARTIAL", "PAID"];

function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatINR(value?: number | null) {
  return `Rs. ${Number(value ?? 0).toLocaleString("en-IN")}`;
}

function labelize(value?: string | null) {
  if (!value) return "Not set";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export default function FinanceEntryScreen() {
  const { accessToken } = useAuth();

  const [entries, setEntries] = useState<ApiFinanceEntry[]>([]);
  const [entryType, setEntryType] = useState<ApiFinanceEntryType>("INVESTMENT");
  const [paymentStatus, setPaymentStatus] = useState<ApiTransactionPaymentStatus>("PAID");
  const [amount, setAmount] = useState("");
  const [entryDate, setEntryDate] = useState(getToday());
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const totalInvestment = useMemo(
    () =>
      entries
        .filter((entry) => entry.type === "INVESTMENT")
        .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0),
    [entries],
  );

  const loadEntries = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await listFinanceEntries(accessToken, { limit: 50 });
      setEntries(response.data);
    } catch (error) {
      showRequestErrorToast(error, {
        title: "Unable to load finance entries",
        fallbackMessage: "Failed to load finance entries.",
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadEntries();
    }, [loadEntries]),
  );

  const resetForm = () => {
    setEntryType("INVESTMENT");
    setPaymentStatus("PAID");
    setAmount("");
    setEntryDate(getToday());
    setDescription("");
    setNotes("");
  };

  const submitEntry = async () => {
    if (!accessToken || saving) return;

    const numericAmount = Number(amount.replace(/,/g, ""));
    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      showRequestErrorToast(new Error("Enter a valid amount."), {
        title: "Amount required",
        fallbackMessage: "Enter a valid amount.",
      });
      return;
    }

    if (!description.trim()) {
      showRequestErrorToast(new Error("Description is required."), {
        title: "Description required",
        fallbackMessage: "Description is required.",
      });
      return;
    }

    setSaving(true);
    try {
      const created = await createFinanceEntry(accessToken, {
        type: entryType,
        amount: numericAmount,
        paymentStatus,
        entryDate,
        description: description.trim(),
        notes: notes.trim() || undefined,
      });

      setEntries((current) => [created, ...current]);
      resetForm();
      showSuccessToast("Finance entry saved.", "Saved");
    } catch (error) {
      showRequestErrorToast(error, {
        title: "Finance entry failed",
        fallbackMessage: "Failed to save finance entry.",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderEntry = ({ item }: { item: ApiFinanceEntry }) => (
    <View style={styles.entryRow}>
      <View style={styles.entryIcon}>
        <MaterialCommunityIcons
          name={item.type === "INVESTMENT" ? "briefcase-outline" : item.type === "OTHER_INCOME" ? "cash-plus" : "cash-minus"}
          size={20}
          color={Colors.primary}
        />
      </View>
      <View style={styles.entryText}>
        <Text style={styles.entryTitle} numberOfLines={1}>{item.description}</Text>
        <Text style={styles.entryMeta}>{[labelize(item.type), item.entryDate, labelize(item.paymentStatus)].join(" | ")}</Text>
      </View>
      <Text style={styles.entryAmount}>{formatINR(item.amount)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopAppBar
        title="Finance Entry"
        subtitle="Record investment, income, and expense entries"
        showBack
        right={
          <TouchableOpacity onPress={() => void loadEntries()} style={styles.headerBtn}>
            <Ionicons name="refresh-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={loading ? [] : entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Investment</Text>
              <Text style={styles.summaryValue}>{formatINR(totalInvestment)}</Text>
              <Text style={styles.summaryHint}>Loaded from /finance/entries</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Create Entry</Text>

              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.typeGrid}>
                {ENTRY_TYPES.map((type) => {
                  const active = entryType === type.key;
                  return (
                    <TouchableOpacity
                      key={type.key}
                      style={[styles.typeChip, active && styles.typeChipActive]}
                      onPress={() => setEntryType(type.key)}
                    >
                      <MaterialCommunityIcons name={type.icon} size={16} color={active ? "#FFF" : Colors.primary} />
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{type.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.fieldLabel}>Amount</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.input}
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                      placeholder="250000"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.fieldLabel}>Date</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.input}
                      value={entryDate}
                      onChangeText={setEntryDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Payment Status</Text>
              <View style={styles.statusRow}>
                {PAYMENT_STATUSES.map((status) => {
                  const active = paymentStatus === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[styles.statusChip, active && styles.statusChipActive]}
                      onPress={() => setPaymentStatus(status)}
                    >
                      <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{labelize(status)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Description</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Owner capital investment"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>

              <Text style={styles.fieldLabel}>Notes</Text>
              <View style={[styles.inputBox, styles.textArea]}>
                <TextInput
                  style={[styles.input, styles.multiLine]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Optional notes"
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                />
              </View>

              <TouchableOpacity style={[styles.submitBtn, saving && styles.btnDisabled]} onPress={submitEntry} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Save Entry</Text>}
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Recent Entries</Text>
          </>
        }
        renderItem={renderEntry}
        ListEmptyComponent={
          loading ? (
            <ScreenState title="Loading entries" message="Fetching finance records." loading />
          ) : (
            <ScreenState title="No finance entries yet" message="Saved entries will appear here." icon="document-text-outline" />
          )
        }
        ListFooterComponent={<View style={{ height: 60 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  headerBtn: { padding: 4 },
  container: {
    flexGrow: 1,
    backgroundColor: "#F9FAFB",
    padding: 16,
  },
  summaryCard: {
    backgroundColor: "#0B5C36",
    borderRadius: 8,
    padding: 18,
    marginBottom: 16,
  },
  summaryLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "700" },
  summaryValue: { color: "#FFF", fontSize: 26, fontWeight: "900", marginTop: 4 },
  summaryHint: { color: "rgba(255,255,255,0.72)", fontSize: 11, marginTop: 6 },
  formCard: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 18,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: Colors.text, marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "800", color: Colors.text, marginBottom: 7, marginTop: 12 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
  },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeChipText: { fontSize: 12, fontWeight: "800", color: Colors.primary },
  typeChipTextActive: { color: "#FFF" },
  row: { flexDirection: "row", gap: 12 },
  flex: { flex: 1 },
  inputBox: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  input: { fontSize: 14, color: Colors.text, padding: 0 },
  textArea: { minHeight: 82, paddingTop: 10 },
  multiLine: { minHeight: 58, textAlignVertical: "top" },
  statusRow: { flexDirection: "row", gap: 8 },
  statusChip: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 9,
    backgroundColor: "#F9FAFB",
  },
  statusChipActive: { borderColor: Colors.primary, backgroundColor: "#E8F5E9" },
  statusChipText: { fontSize: 12, fontWeight: "800", color: Colors.textSecondary },
  statusChipTextActive: { color: Colors.primary },
  submitBtn: {
    height: 50,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  submitBtnText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  btnDisabled: { opacity: 0.72 },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 13,
    marginBottom: 10,
  },
  entryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    marginRight: 12,
  },
  entryText: { flex: 1, paddingRight: 8 },
  entryTitle: { fontSize: 14, fontWeight: "800", color: Colors.text },
  entryMeta: { fontSize: 11, color: Colors.textSecondary, marginTop: 3 },
  entryAmount: { fontSize: 13, fontWeight: "900", color: Colors.text },
});
