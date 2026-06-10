import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/Colors";
import type { ApiFinancePayment } from "@/services/managementApi";

const THEME_GREEN = "#0B5C36";

function formatDate(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(value?: number | null) {
  return `₹ ${Number(value ?? 0).toLocaleString("en-IN")}`;
}

function labelize(value?: string | null) {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

type DetailRowProps = {
  label: string;
  value: string;
  valueColor?: string;
};

function DetailRow({ label, value, valueColor }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueColor ? { color: valueColor } : undefined]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

type PaymentDetailModalProps = {
  visible: boolean;
  item: ApiFinancePayment | null;
  onClose: () => void;
  title?: string;
};

export function PaymentDetailModal({ visible, item, onClose, title = "Payment Details" }: PaymentDetailModalProps) {
  if (!item) return null;

  const partyName = item.partyName || item.vendorName || item.traderName || "Unknown Party";
  const mode = getPaymentMode(item);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={styles.sheet}
          activeOpacity={1}
          onPress={() => {}}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {/* Party & Amount Hero */}
            <View style={styles.heroSection}>
              <View style={styles.heroIcon}>
                <Ionicons name="person-outline" size={22} color="#FFF" />
              </View>
              <Text style={styles.heroPartyName}>{partyName}</Text>
              <Text style={styles.heroAmount}>{formatAmount(item.amount)}</Text>
              <View style={[styles.heroModePill, { backgroundColor: mode.bg }]}>
                <Text style={[styles.heroModeText, { color: mode.color }]}>{mode.label}</Text>
              </View>
            </View>

            {/* Details Grid */}
            <View style={styles.detailsCard}>
              <DetailRow label="Payment Date" value={formatDate(item.paymentDate)} />
              <View style={styles.divider} />
              {item.vendorName ? (
                <>
                  <View style={styles.divider} />
                  <DetailRow label="Vendor" value={item.vendorName} />
                </>
              ) : null}
              {item.traderName ? (
                <>
                  <View style={styles.divider} />
                  <DetailRow label="Trader" value={item.traderName} />
                </>
              ) : null}
              {item.notes ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.notesBox}>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <Text style={styles.notesText}>{item.notes}</Text>
                  </View>
                </>
              ) : null}
            </View>

           
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function getPaymentMode(item: ApiFinancePayment) {
  const haystack = `${item.referenceType ?? ""} ${item.notes ?? ""} ${item.paymentType ?? ""}`.toLowerCase();
  if (haystack.includes("bank") || haystack.includes("upi") || haystack.includes("neft")) {
    return { label: "Bank", bg: "#EFF6FF", color: "#2563EB" };
  }
  return { label: "Cash", bg: "#E8F5E9", color: THEME_GREEN };
}

export type { PaymentDetailModalProps };

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    paddingBottom: 24,
  },
  sheetHeader: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  sheetBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 16,
  },

  // Hero
  heroSection: {
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7ECF2",
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  heroPartyName: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
    textAlign: "center",
  },
  heroAmount: {
    fontSize: 22,
    fontWeight: "900",
    color: THEME_GREEN,
    marginTop: 6,
  },
  heroModePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  heroModeText: {
    fontSize: 10,
    fontWeight: "900",
  },

  // Details Card
  detailsCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7ECF2",
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 40,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    flex: 1,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "right",
    flex: 1.5,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 14,
  },
  notesBox: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  notesText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
    lineHeight: 18,
    marginTop: 6,
  },

  // Timestamps
  timestampsCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E7ECF2",
  },
  timestampLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textSecondary,
    textTransform: "uppercase",
  },
  timestampValue: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
});
