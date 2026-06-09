import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

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
// Removed master data imports

type SettingsForm = {
  currency: string;
  mobileFirst: boolean;
  farmerExpenseCategories: string;
  companyExpenseCategories: string;
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
    mobileFirst: Boolean(settings.mobileFirst),
    farmerExpenseCategories: (settings.expenseCategories?.farmer ?? []).join(", "),
    companyExpenseCategories: (settings.expenseCategories?.company ?? []).join(", "),
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
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [farmerCategoryDraft, setFarmerCategoryDraft] = useState("");
  const [companyCategoryDraft, setCompanyCategoryDraft] = useState("");

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

  const getCategoryList = (key: "farmerExpenseCategories" | "companyExpenseCategories") =>
    (form?.[key] ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const setCategoryList = (
    key: "farmerExpenseCategories" | "companyExpenseCategories",
    values: string[],
  ) => {
    setField(key, values.join(", "));
  };

  const removeCategory = (
    key: "farmerExpenseCategories" | "companyExpenseCategories",
    value: string,
  ) => {
    setCategoryList(
      key,
      getCategoryList(key).filter((item) => item !== value),
    );
  };

  const addCategory = (
    key: "farmerExpenseCategories" | "companyExpenseCategories",
    value: string,
    reset: () => void,
  ) => {
    const nextValue = value.trim();
    if (!nextValue) return;

    const currentValues = getCategoryList(key);
    const alreadyAdded = currentValues.some(
      (item) => item.toLowerCase() === nextValue.toLowerCase(),
    );
    if (alreadyAdded) {
      reset();
      return;
    }

    setCategoryList(key, [...currentValues, nextValue]);
    reset();
  };

  const saveSettings = async () => {
    if (!accessToken || !form || saving) return;

    setSaving(true);
    try {
      const updated = await updateOrganizationSettings(accessToken, {
        currency: form.currency.trim() || "INR",
        mobileFirst: form.mobileFirst,
        expenseCategories: {
          farmer: form.farmerExpenseCategories
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          company: form.companyExpenseCategories
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        },
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

  const focusedSection = typeof section === "string" ? section : "";
  const showAllSections = !focusedSection;
  const showSection = (key: string) => showAllSections || focusedSection === key;
  const screenTitle =
    focusedSection === "payoutRules"
      ? "Payout Rules"
      : focusedSection === "alerts"
        ? "Alerts"
        : focusedSection === "financialControl"
          ? "Financial Control"
          : "Organization Settings";
  const screenSubtitle =
    focusedSection === "payoutRules"
      ? "Based on KG sold or Production Cost"
      : focusedSection === "alerts"
        ? "Pending Entry, FCR, and Mortality"
        : focusedSection === "financialControl"
          ? "Supervisor expenses and farmer approval"
          : "Payout, alert, and finance controls";


  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title={screenTitle}
        subtitle={screenSubtitle}
        onBack={() => {
          if (focusedSection) {
            router.replace('/(owner)/profile');
            return;
          }
          router.replace('/(owner)/dashboard');
        }}
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
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
        >
          {showAllSections ? <View style={styles.heroPanel}>
            <View style={styles.heroIcon}>
              <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>App Settings</Text>
              <Text style={styles.heroSubtitle}>
                Security, payout rules, alerts, and finance permissions in one place.
              </Text>
            </View>
          </View> : null}

          {showAllSections ? <View style={styles.summaryGrid}>
            <SummaryTile icon="cash-outline" label="Currency" value={form.currency || "INR"} color="#0F766E" />
            <SummaryTile icon="scale-outline" label="Payout Unit" value={labelize(form.defaultPayoutUnit)} color="#2563EB" />
            <SummaryTile icon="warning-outline" label="Pending Alert" value={`${form.pendingEntryDays || 0} days`} color="#B45309" />
            <SummaryTile
              icon="shield-checkmark-outline"
              label="Approvals"
              value={form.farmerExpenseRequiresApproval ? "Required" : "Optional"}
              color="#7C3AED"
            />
          </View> : null}

          {showSection("security") ? <SectionCard
            title="Security"
            subtitle="Login preferences and mobile-first behavior"
            icon="lock-closed-outline"
            accent="#0B5C36"
          >
            <Field label="Currency" value={form.currency} onChangeText={(value) => setField("currency", value)} />
            <ToggleRow
              label="Mobile First"
              description="Optimize screens for field users on mobile devices."
              value={form.mobileFirst}
              onValueChange={(value) => setField("mobileFirst", value)}
              isLast
            />
          </SectionCard> : null}


          {showSection("expenseCategories") ? <SectionCard
            title="Expense Categories"
            subtitle="Keep farmer and company expense options tidy"
            icon="pricetags-outline"
            accent="#0891B2"
          >
            <CategoryEditor
              title="Farmer Categories"
              icon="leaf-outline"
              values={getCategoryList("farmerExpenseCategories")}
              draft={farmerCategoryDraft}
              onDraftChange={setFarmerCategoryDraft}
              onAdd={() =>
                addCategory("farmerExpenseCategories", farmerCategoryDraft, () => setFarmerCategoryDraft(""))
              }
              onRemove={(value) => removeCategory("farmerExpenseCategories", value)}
            />
            <CategoryEditor
              title="Company Categories"
              icon="business-outline"
              values={getCategoryList("companyExpenseCategories")}
              draft={companyCategoryDraft}
              onDraftChange={setCompanyCategoryDraft}
              onAdd={() =>
                addCategory("companyExpenseCategories", companyCategoryDraft, () => setCompanyCategoryDraft(""))
              }
              onRemove={(value) => removeCategory("companyExpenseCategories", value)}
            />
          </SectionCard> : null}

          {showSection("payoutRules") ? <SectionCard
            title="Payout Rules"
            subtitle="Decide how farmer settlement amount is calculated"
            icon="cash-outline"
            accent="#2563EB"
          >
            <Field
              label="Default Payout Rate"
              value={form.defaultPayoutRate}
              onChangeText={(value) => setField("defaultPayoutRate", value)}
              keyboardType="decimal-pad"
            />
            <Text style={styles.fieldLabel}>Default Payout Unit</Text>
            <View style={styles.segmentedGroup}>
              {PAYOUT_UNITS.map((unit) => {
                const active = form.defaultPayoutUnit === unit;
                return (
                  <TouchableOpacity
                    key={unit}
                    style={[styles.segmentButton, active && styles.segmentButtonActive]}
                    onPress={() => setField("defaultPayoutUnit", unit)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{labelize(unit)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard> : null}

          {showSection("alerts") ? <SectionCard
            title="Alerts"
            subtitle="Trigger attention for pending entry, FCR, and mortality"
            icon="notifications-outline"
            accent="#B45309"
          >
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
          </SectionCard> : null}

          {showSection("financialControl") ? <SectionCard
            title="Financial Control"
            subtitle="Supervisor expense permissions and approval checks"
            icon="shield-checkmark-outline"
            accent="#7C3AED"
          >
            <ToggleRow
              label="Supervisor can add farmer expense"
              description="Allow supervisors to create farmer-side expenses."
              value={form.supervisorCanAddFarmerExpense}
              onValueChange={(value) => setField("supervisorCanAddFarmerExpense", value)}
            />
            <ToggleRow
              label="Supervisor can add company expense"
              description="Allow supervisors to record company-side expenses."
              value={form.supervisorCanAddCompanyExpense}
              onValueChange={(value) => setField("supervisorCanAddCompanyExpense", value)}
            />
            <ToggleRow
              label="Farmer expense requires approval"
              description="Approved farmer expense will be included during batch settlement."
              value={form.farmerExpenseRequiresApproval}
              onValueChange={(value) => setField("farmerExpenseRequiresApproval", value)}
              isLast
            />
          </SectionCard> : null}



          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={saveSettings} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#FFF" />
                <Text style={styles.saveBtnText}>Save Settings</Text>
              </>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      )}
    </View>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.summaryTile}>
      <View style={[styles.summaryIcon, { backgroundColor: `${color}16` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.summaryLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function SectionCard({
  title,
  subtitle,
  icon,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: `${accent}14` }]}>
          <Ionicons name={icon} size={20} color={accent} />
        </View>
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionHint}>{subtitle}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "decimal-pad" | "numeric";
  multiline?: boolean;
}) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputBox, multiline && styles.inputBoxMultiline]}>
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          placeholderTextColor={Colors.textSecondary}
        />
      </View>
    </>
  );
}

function CategoryEditor({
  title,
  icon,
  values,
  draft,
  onDraftChange,
  onAdd,
  onRemove,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  values: string[];
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (value: string) => void;
}) {
  return (
    <View style={styles.categoryPanel}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryIcon}>
          <Ionicons name={icon} size={18} color={Colors.primary} />
        </View>
        <View style={styles.categoryTitleBlock}>
          <Text style={styles.categoryTitle}>{title}</Text>
          <Text style={styles.categoryMeta}>{values.length} item{values.length === 1 ? "" : "s"}</Text>
        </View>
      </View>

      {values.length ? (
        <View style={styles.categoryChipWrap}>
          {values.map((value) => (
            <View key={value} style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{value}</Text>
              <TouchableOpacity
                style={styles.categoryChipRemove}
                onPress={() => onRemove(value)}
                activeOpacity={0.75}
              >
                <Ionicons name="close" size={14} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.categoryEmptyText}>No categories added yet.</Text>
      )}

      <View style={styles.categoryAddRow}>
        <TextInput
          style={styles.categoryInput}
          value={draft}
          onChangeText={onDraftChange}
          placeholder="Add category"
          placeholderTextColor={Colors.textSecondary}
          returnKeyType="done"
          onSubmitEditing={onAdd}
        />
        <TouchableOpacity style={styles.categoryAddButton} onPress={onAdd} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  isLast,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, isLast && styles.toggleRowLast]}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description ? <Text style={styles.toggleDescription}>{description}</Text> : null}
      </View>
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
  safeArea: { flex: 1, backgroundColor: Colors.background },
  headerBtn: { padding: 4 },
  centerBox: { flex: 1, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center", gap: 10 },
  container: { flexGrow: 1, backgroundColor: Colors.background, padding: 16, paddingBottom: 88 },
  heroPanel: {
    borderRadius: 8,
    backgroundColor: Colors.secondary,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  heroSubtitle: {
    marginTop: 4,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  summaryTile: {
    width: "48.5%",
    minHeight: 112,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 12,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  summaryLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  summaryValue: {
    marginTop: 4,
    color: Colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: Colors.text },
  sectionHint: {
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
    fontWeight: "600",
    marginTop: 2,
  },
  fieldLabel: { fontSize: 12, fontWeight: "800", color: Colors.text, marginBottom: 7, marginTop: 12 },
  inputBox: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  inputBoxMultiline: {
    minHeight: 84,
    paddingVertical: 10,
    alignItems: "stretch",
  },
  input: { fontSize: 14, color: Colors.text, padding: 0 },
  inputMultiline: {
    minHeight: 60,
    lineHeight: 20,
  },
  categoryPanel: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    padding: 12,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  categoryIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF8F0",
  },
  categoryTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  categoryTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  categoryMeta: {
    marginTop: 2,
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  categoryChipWrap: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    rowGap: 6,
  },
  categoryChip: {
    minHeight: 34,
    maxWidth: "100%",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#B7E2BD",
    backgroundColor: "#EEF8F0",
    paddingLeft: 12,
    paddingRight: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  categoryChipText: {
    flexShrink: 1,
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  categoryChipRemove: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  categoryEmptyText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  categoryAddRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryInput: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700",
    backgroundColor: "#FFFFFF",
  },
  categoryAddButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  segmentedGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segmentButton: {
    flexGrow: 1,
    minWidth: "30%",
    minHeight: 42,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    marginBottom: 6,
  },
  segmentButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segmentText: { fontSize: 12, fontWeight: "900", color: Colors.textSecondary, textAlign: "center" },
  segmentTextActive: { color: "#FFF" },
  toggleRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 12,
    gap: 12,
  },
  toggleRowLast: { borderBottomWidth: 0 },
  toggleCopy: {
    flex: 1,
    minWidth: 0,
  },
  toggleLabel: { fontSize: 14, fontWeight: "800", color: Colors.text },
  toggleDescription: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  saveBtn: {
    height: 52,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.72 },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },

});
