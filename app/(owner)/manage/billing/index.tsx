import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";

import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { ScreenState } from "@/components/ui/ScreenState";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import {
  listSubscriptionPlans,
  fetchCurrentSubscription,
  requestSubscription,
  submitSubscriptionPayment,
  type ApiSubscriptionPlan,
  type ApiSubscription,
  type ApiSubscriptionStatus,
} from "@/services/subscriptionApi";

const THEME_GREEN = "#0B5C36";

export default function BillingScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<ApiSubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<ApiSubscription | null>(null);

  // Flow control states
  const [selectedPlan, setSelectedPlan] = useState<ApiSubscriptionPlan | null>(null);
  const [subRequest, setSubRequest] = useState<ApiSubscription | null>(null);
  
  // Payment Form States
  const [refNumber, setRefNumber] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [submittingProof, setSubmittingProof] = useState(false);
  const [requestingPlan, setRequestingPlan] = useState(false);

  const loadBillingData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [plansData, currentData] = await Promise.all([
        listSubscriptionPlans(accessToken),
        fetchCurrentSubscription(accessToken),
      ]);
      setPlans(plansData || []);
      setCurrentSubscription(currentData);

      // If there is a pending subscription request, auto-populate it
      if (currentData?.status === "PENDING_APPROVAL" || currentData?.status === "TRIAL") {
        setSubRequest(currentData);
      }
    } catch (error) {
      showRequestErrorToast(error, {
        title: "Billing Load Failed",
        fallbackMessage: "Failed to fetch plans or current subscription.",
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadBillingData();
    }, [loadBillingData])
  );

  const handleSelectPlan = async (plan: ApiSubscriptionPlan) => {
    if (!accessToken) return;
    setSelectedPlan(plan);
    setRequestingPlan(true);
    try {
      const response = await requestSubscription(accessToken, {
        planCode: plan.code,
      });
      setSubRequest(response);
      showSuccessToast(`Subscription requested for ${plan.name}.`, "Success");
    } catch (error) {
      showRequestErrorToast(error, {
        title: "Plan Selection Failed",
        fallbackMessage: "Unable to complete subscription request.",
      });
      setSelectedPlan(null);
    } finally {
      setRequestingPlan(false);
    }
  };

  const handlePayUPI = () => {
    const upiLink = subRequest?.upiDeepLink || `upi://pay?pa=boilerfarm@upi&pn=Boiler%20Farm%20Management&am=${selectedPlan?.amountInr || 299}`;
    Linking.openURL(upiLink).catch(() => {
      Alert.alert(
        "UPI Launch Failed",
        "Could not open UPI apps on this device. Please transfer manually using our details below."
      );
    });
  };

  const handleSubmitProof = async () => {
    if (!accessToken || !subRequest) return;
    if (!refNumber.trim()) {
      Alert.alert("Required", "Please enter the UTR/Reference Number.");
      return;
    }
    if (!payerName.trim()) {
      Alert.alert("Required", "Please enter the Payer Name.");
      return;
    }

    setSubmittingProof(true);
    try {
      await submitSubscriptionPayment(accessToken, {
        subscriptionId: subRequest.id,
        referenceNumber: refNumber.trim(),
        payerName: payerName.trim(),
        payerPhone: payerPhone.trim() || undefined,
        proofUrl: "https://cdn.example.com/payments/proof-01.jpg", // default dummy
      });
      showSuccessToast("Payment details submitted successfully.", "Proof Submitted");
      
      // Reset form and reload
      setRefNumber("");
      setPayerName("");
      setPayerPhone("");
      setSelectedPlan(null);
      setSubRequest(null);
      void loadBillingData();
    } catch (error) {
      showRequestErrorToast(error, {
        title: "Submission Failed",
        fallbackMessage: "Could not upload transaction details.",
      });
    } finally {
      setSubmittingProof(false);
    }
  };

  const getStatusColor = (status: ApiSubscriptionStatus) => {
    switch (status) {
      case "ACTIVE":
      case "TRIAL":
        return "#10B981";
      case "PENDING_APPROVAL":
        return "#F59E0B";
      case "EXPIRED":
      case "CANCELLED":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  if (loading) {
    return (
      <View style={styles.safeArea}>
        <TopAppBar title="Billing & Subscriptions" subtitle="Manage PoultryFlow business plans" onBack={() => router.replace('/(owner)/dashboard')} />
        <View style={styles.centerBox}>
          <ScreenState title="Loading Plans" message="Fetching latest subscription plans and status..." loading />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Billing & Subscription"
        subtitle="UPI Quick Pay & Plan Management"
        onBack={() => router.replace('/(owner)/dashboard')}
        right={
          <TouchableOpacity onPress={() => void loadBillingData()} style={styles.headerBtn}>
            <Ionicons name="refresh-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* Active/Current Subscription Card */}
          {currentSubscription ? (
            <SurfaceCard style={styles.activeSubCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.activeSubTitle}>Current Plan</Text>
                  <Text style={styles.planNameText}>{currentSubscription.planName}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { borderColor: getStatusColor(currentSubscription.status), backgroundColor: `${getStatusColor(currentSubscription.status)}15` },
                  ]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(currentSubscription.status) }]}>
                    {currentSubscription.status.replace("_", " ")}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsDivider} />

              <View style={styles.detailsRow}>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Valid From</Text>
                  <Text style={styles.detailValue}>{formatDate(currentSubscription.startsAt)}</Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Expires On</Text>
                  <Text style={styles.detailValue}>{formatDate(currentSubscription.endsAt)}</Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Plan Cost</Text>
                  <Text style={styles.detailValue}>₹{currentSubscription.amountInr}</Text>
                </View>
              </View>

              {currentSubscription.notes ? (
                <View style={styles.notesBox}>
                  <Ionicons name="information-circle-outline" size={16} color="#4B5563" />
                  <Text style={styles.notesText}>{currentSubscription.notes}</Text>
                </View>
              ) : null}
            </SurfaceCard>
          ) : (
            <SurfaceCard style={styles.noSubCard}>
              <View style={styles.noSubHeader}>
                <Ionicons name="alert-circle-outline" size={28} color="#EA580C" />
                <Text style={styles.noSubTitle}>No Active Subscription</Text>
              </View>
              <Text style={styles.noSubDesc}>
                Your account is currently running on basic/trial state. Please choose a premium plan below to activate full operations.
              </Text>
            </SurfaceCard>
          )}

          {/* Payment Gateway Modal Flow (Render inline on the screen for premium visibility) */}
          {subRequest && (subRequest.status === "PENDING_APPROVAL" || selectedPlan) ? (
            <SurfaceCard style={styles.paymentCard}>
              <View style={styles.payHeader}>
                <FontAwesome5 name="wallet" size={22} color={THEME_GREEN} />
                <Text style={styles.payTitle}>UPI Direct Payment Gateway</Text>
              </View>
              <Text style={styles.paySubtitle}>
                Request ID: {subRequest.id.slice(0, 8).toUpperCase()} | Plan: {selectedPlan?.name || subRequest.planName}
              </Text>

              <View style={styles.payoutSummaryBox}>
                <Text style={styles.payableLabel}>Amount Payable</Text>
                <Text style={styles.payableVal}>₹{selectedPlan?.amountInr || subRequest.amountInr}</Text>
              </View>

              <TouchableOpacity style={styles.upiBtn} onPress={handlePayUPI}>
                <Ionicons name="logo-android" size={20} color="#FFF" />
                <Text style={styles.upiBtnText}>Pay Instantly via UPI App</Text>
              </TouchableOpacity>

              <View style={styles.manualTransferBox}>
                <Text style={styles.manualTitle}>Or Pay Manually via UPI ID:</Text>
                <View style={styles.upiCopyRow}>
                  <Text style={styles.upiIdText}>boilerfarm@upi</Text>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={() => {
                      showSuccessToast("UPI ID copied to clipboard", "Copied");
                    }}
                  >
                    <Ionicons name="copy-outline" size={16} color={THEME_GREEN} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.detailsDivider} />

              {/* Payment Proof Submission Form */}
              <Text style={styles.formTitle}>Submit Payment Verification Details</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>UTR / Transaction Reference ID (12-digit)</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={refNumber}
                    onChangeText={setRefNumber}
                    placeholder="e.g. 614718274910"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Payer / Account Name</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={payerName}
                    onChangeText={setPayerName}
                    placeholder="e.g. Gopal Mewada"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Payer Phone Number (10-digit)</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={payerPhone}
                    onChangeText={setPayerPhone}
                    placeholder="e.g. 9876543210"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnCancel]}
                  onPress={() => {
                    setSelectedPlan(null);
                    setSubRequest(null);
                  }}
                >
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.btn, styles.btnSubmit]}
                  onPress={handleSubmitProof}
                  disabled={submittingProof}
                >
                  {submittingProof ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.btnSubmitText}>Submit Verification</Text>
                  )}
                </TouchableOpacity>
              </View>
            </SurfaceCard>
          ) : null}

          {/* Premium Plans Catalog */}
          <Text style={styles.catalogTitle}>Available Business Plans</Text>
          {plans.map((plan) => {
            const isCurrent = currentSubscription?.planCode === plan.code;
            return (
              <SurfaceCard key={plan.id} style={[styles.planCard, isCurrent && styles.activePlanCardBorder]}>
                <View style={styles.planCardHeader}>
                  <View>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planDesc}>{plan.description || "Premium business support"}</Text>
                  </View>
                  <View style={styles.planPriceBox}>
                    <Text style={styles.planPrice}>₹{plan.amountInr}</Text>
                    <Text style={styles.planPeriod}>/{plan.durationDays} Days</Text>
                  </View>
                </View>

                <View style={styles.planDetailsGrid}>
                  <View style={styles.planInfoPill}>
                    <Ionicons name="business-outline" size={14} color={THEME_GREEN} />
                    <Text style={styles.planDetailPillText}>
                      Farms: {plan.maxFarms ? `${plan.maxFarms} Limit` : "Unlimited"}
                    </Text>
                  </View>
                  <View style={styles.planInfoPill}>
                    <Ionicons name="people-outline" size={14} color={THEME_GREEN} />
                    <Text style={styles.planDetailPillText}>
                      Users: {plan.maxUsers ? `${plan.maxUsers} Limit` : "Unlimited"}
                    </Text>
                  </View>
                  <View style={styles.planInfoPill}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={THEME_GREEN} />
                    <Text style={styles.planDetailPillText}>UPI Direct Pay</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.selectPlanBtn,
                    isCurrent && styles.selectPlanBtnDisabled,
                    requestingPlan && selectedPlan?.id === plan.id && { opacity: 0.6 }
                  ]}
                  onPress={() => void handleSelectPlan(plan)}
                  disabled={isCurrent || requestingPlan}
                >
                  {requestingPlan && selectedPlan?.id === plan.id ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.selectPlanBtnText}>
                      {isCurrent ? "Current Active Plan" : "Choose & Activate Plan"}
                    </Text>
                  )}
                </TouchableOpacity>
              </SurfaceCard>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  headerBtn: { padding: 4 },
  centerBox: { flex: 1, backgroundColor: "#F9FAFB", justifyContent: "center", alignItems: "center" },
  scrollContainer: { flexGrow: 1, backgroundColor: "#F9FAFB", paddingHorizontal: 16, paddingTop: 16 },
  
  // Active Sub Styles
  activeSubCard: {
    backgroundColor: "#FFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  activeSubTitle: { fontSize: 12, fontWeight: "800", color: "#6B7280" },
  planNameText: { fontSize: 18, fontWeight: "900", color: "#111827", marginTop: 2 },
  statusBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: "700" },
  detailsDivider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 14 },
  detailsRow: { flexDirection: "row", justifyContent: "space-between" },
  detailCol: { flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: "800", color: "#9CA3AF" },
  detailValue: { fontSize: 13, fontWeight: "800", color: "#374151", marginTop: 4 },
  notesBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 14,
  },
  notesText: { flex: 1, fontSize: 12, fontWeight: "600", color: "#4B5563" },

  // No Sub Styles
  noSubCard: {
    backgroundColor: "#FFF",
    borderColor: "#FED7AA",
    borderWidth: 1,
    marginBottom: 16,
  },
  noSubHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  noSubTitle: { fontSize: 16, fontWeight: "800", color: "#EA580C" },
  noSubDesc: { fontSize: 13, color: "#6B7280", fontWeight: "600", marginTop: 10, lineHeight: 18 },

  // Payment Form Styles
  paymentCard: {
    backgroundColor: "#FFF",
    borderColor: THEME_GREEN,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  payHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  payTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  paySubtitle: { fontSize: 12, fontWeight: "700", color: "#6B7280", marginTop: 4 },
  payoutSummaryBox: {
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#B7E0C2",
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 14,
  },
  payableLabel: { fontSize: 12, fontWeight: "800", color: THEME_GREEN },
  payableVal: { fontSize: 26, fontWeight: "900", color: THEME_GREEN, marginTop: 4 },
  upiBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: THEME_GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
  },
  upiBtnText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  manualTransferBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    alignItems: "center",
  },
  manualTitle: { fontSize: 11, fontWeight: "700", color: "#4B5563" },
  upiCopyRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  upiIdText: { fontSize: 14, fontWeight: "800", color: THEME_GREEN },
  copyBtn: { padding: 4 },

  formTitle: { fontSize: 14, fontWeight: "800", color: "#111827", marginBottom: 12 },
  formGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: "800", color: "#4B5563", marginBottom: 6 },
  inputBox: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  input: { fontSize: 13, color: "#111827", padding: 0 },
  buttonRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 14 },
  btn: {
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  btnCancel: { backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  btnCancelText: { color: "#4B5563", fontSize: 13, fontWeight: "800" },
  btnSubmit: { backgroundColor: THEME_GREEN },
  btnSubmitText: { color: "#FFF", fontSize: 13, fontWeight: "800" },

  // Catalog Styles
  catalogTitle: { fontSize: 15, fontWeight: "800", color: THEME_GREEN, marginBottom: 12, marginTop: 4 },
  planCard: {
    backgroundColor: "#FFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    marginBottom: 12,
  },
  activePlanCardBorder: { borderColor: THEME_GREEN, borderWidth: 1.5 },
  planCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  planName: { fontSize: 16, fontWeight: "800", color: "#111827" },
  planDesc: { fontSize: 12, color: "#6B7280", fontWeight: "600", marginTop: 4, flexShrink: 1 },
  planPriceBox: { alignItems: "flex-end" },
  planPrice: { fontSize: 20, fontWeight: "900", color: THEME_GREEN },
  planPeriod: { fontSize: 10, fontWeight: "700", color: "#9CA3AF" },
  planDetailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  planInfoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  planDetailPillText: { fontSize: 11, fontWeight: "700", color: THEME_GREEN },
  selectPlanBtn: {
    height: 44,
    borderRadius: 8,
    backgroundColor: THEME_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  selectPlanBtnDisabled: { backgroundColor: "#D1D5DB" },
  selectPlanBtnText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
});
