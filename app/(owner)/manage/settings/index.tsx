import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { ScreenState } from "@/components/ui/ScreenState";
import { TopAppBar } from "@/components/ui/TopAppBar";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import {
  fetchOrganizationSettings,
  updateOrganizationSettings,
  type ApiOrganizationSettings,
} from "@/services/settingsApi";

type SettingsForm = {
  currency: string;
  defaultPayoutRate: string;
  defaultPayoutUnit: ApiOrganizationSettings["payoutRules"]["defaultPayoutUnit"];
  pendingEntryDays: string;
  fcr: string;
  mortalityPercent: string;
  supervisorCanAddFarmerExpense: boolean;
  supervisorCanAddCompanyExpense: boolean;
  farmerExpenseRequiresApproval: boolean;
};

const PAYOUT_UNITS: SettingsForm["defaultPayoutUnit"][] = [
  "PER_BIRD_PLACED",
  "PER_BIRD_SOLD",
  "PER_KG_SOLD",
];

function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function toForm(settings: ApiOrganizationSettings): SettingsForm {
  return {
    currency: settings.currency || "INR",
    defaultPayoutRate: String(settings.payoutRules?.defaultPayoutRate ?? ""),
    defaultPayoutUnit: settings.payoutRules?.defaultPayoutUnit ?? "PER_KG_SOLD",
    pendingEntryDays: String(settings.alertThresholds?.pendingEntryDays ?? ""),
    fcr: String(settings.alertThresholds?.fcr ?? ""),
    mortalityPercent: String(settings.alertThresholds?.mortalityPercent ?? ""),
    supervisorCanAddFarmerExpense: Boolean(settings.financialConfig?.supervisorCanAddFarmerExpense),
    supervisorCanAddCompanyExpense: Boolean(settings.financialConfig?.supervisorCanAddCompanyExpense),
    farmerExpenseRequiresApproval: Boolean(settings.financialConfig?.farmerExpenseRequiresApproval),
  };
}

export default function OrganizationSettingsScreen() {
  const { accessToken } = useAuth();
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await fetchOrganizationSettings(accessToken);
      setForm(toForm(response));
    } catch (error) {
      showRequestErrorToast(error, {
        title: "Unable to load settings",
        fallbackMessage: "Failed to load organization settings.",
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
    }, [loadSettings]),
  );

  const setField = <Key extends keyof SettingsForm>(key: Key, value: SettingsForm[Key]) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
  };

  const saveSettings = async () => {
    if (!accessToken || !form || saving) return;

    setSaving(true);
    try {
      const updated = await updateOrganizationSettings(accessToken, {
        currency: form.currency.trim() || "INR",
        payoutRules: {
          defaultPayoutRate: Number(form.defaultPayoutRate || 0),
          defaultPayoutUnit: form.defaultPayoutUnit,
        },
        alertThresholds: {
          pendingEntryDays: Number(form.pendingEntryDays || 0),
          fcr: Number(form.fcr || 0),
          mortalityPercent: Number(form.mortalityPercent || 0),
        },
        financialConfig: {
          supervisorCanAddFarmerExpense: form.supervisorCanAddFarmerExpense,
          supervisorCanAddCompanyExpense: form.supervisorCanAddCompanyExpense,
          farmerExpenseRequiresApproval: form.farmerExpenseRequiresApproval,
        },
      });
      setForm(toForm(updated));
      showSuccessToast("Organization settings updated.", "Saved");
    } catch (error) {
      showRequestErrorToast(error, {
        title: "Settings update failed",
        fallbackMessage: "Failed to update organization settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Organization Settings"
        subtitle="Payout, alert, and finance controls"
        right={
          <TouchableOpacity onPress={() => void loadSettings()} style={styles.headerBtn}>
            <Ionicons name="refresh-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        }
      />

      {loading || !form ? (
        <View style={styles.centerBox}>
          <ScreenState title="Loading settings" message="Fetching organization configuration." loading />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Currency & Payout</Text>
            <Field label="Currency" value={form.currency} onChangeText={(value) => setField("currency", value)} />
            <Field
              label="Default Payout Rate"
              value={form.defaultPayoutRate}
              onChangeText={(value) => setField("defaultPayoutRate", value)}
              keyboardType="decimal-pad"
            />
            <Text style={styles.fieldLabel}>Default Payout Unit</Text>
            <View style={styles.chipRow}>
              {PAYOUT_UNITS.map((unit) => {
                const active = form.defaultPayoutUnit === unit;
                return (
                  <TouchableOpacity
                    key={unit}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setField("defaultPayoutUnit", unit)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{labelize(unit)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Alert Thresholds</Text>
            <Field
              label="Pending Entry Days"
              value={form.pendingEntryDays}
              onChangeText={(value) => setField("pendingEntryDays", value)}
              keyboardType="numeric"
            />
            <Field label="FCR Alert" value={form.fcr} onChangeText={(value) => setField("fcr", value)} keyboardType="decimal-pad" />
            <Field
              label="Mortality Percent"
              value={form.mortalityPercent}
              onChangeText={(value) => setField("mortalityPercent", value)}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Financial Controls</Text>
            <ToggleRow
              label="Supervisor can add farmer expense"
              value={form.supervisorCanAddFarmerExpense}
              onValueChange={(value) => setField("supervisorCanAddFarmerExpense", value)}
            />
            <ToggleRow
              label="Supervisor can add company expense"
              value={form.supervisorCanAddCompanyExpense}
              onValueChange={(value) => setField("supervisorCanAddCompanyExpense", value)}
            />
            <ToggleRow
              label="Farmer expense requires approval"
              value={form.farmerExpenseRequiresApproval}
              onValueChange={(value) => setField("farmerExpenseRequiresApproval", value)}
              isLast
            />
          </View>

          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={saveSettings} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Settings</Text>}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "decimal-pad" | "numeric";
}) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholderTextColor={Colors.textSecondary}
        />
      </View>
    </>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
  isLast,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, isLast && styles.toggleRowLast]}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#D1D5DB", true: "#B7E0C2" }}
        thumbColor={value ? Colors.primary : "#F9FAFB"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  headerBtn: { padding: 4 },
  centerBox: { flex: 1, backgroundColor: "#F9FAFB", justifyContent: "center", alignItems: "center", gap: 10 },
  container: { flexGrow: 1, backgroundColor: "#F9FAFB", padding: 16 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: Colors.text, marginBottom: 8 },
  fieldLabel: { fontSize: 12, fontWeight: "800", color: Colors.text, marginBottom: 7, marginTop: 12 },
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: "800", color: Colors.textSecondary },
  chipTextActive: { color: "#FFF" },
  toggleRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  toggleRowLast: { borderBottomWidth: 0 },
  toggleLabel: { flex: 1, fontSize: 14, fontWeight: "700", color: Colors.text },
  saveBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.72 },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
