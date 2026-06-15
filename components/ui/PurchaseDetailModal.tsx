import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/Colors";
import type { ApiFinancePurchase } from "@/services/managementApi";

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
  return `Rs ${Number(value ?? 0).toLocaleString("en-IN")}`;
}

function formatQuantity(value?: number | null, unit?: string | null) {
  const quantity = Number(value ?? 0).toLocaleString("en-IN");
  return unit ? `${quantity} ${unit}` : quantity;
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

type PurchaseDetailModalProps = {
  visible: boolean;
  item: ApiFinancePurchase | null;
  onClose: () => void;
  title?: string;
};

export function PurchaseDetailModal({ visible, item, onClose, title = "Purchase Details" }: PurchaseDetailModalProps) {
  const router = useRouter();

  if (!item) return null;

  const paymentStatusTone = getPaymentTone(item.paymentStatus);

  const handleEdit = () => {
    onClose();
    router.navigate({
      pathname: "/(owner)/manage/purchase/createupdate",
      params: {
        purchaseId: item.id,
        batchId: item.batchId ?? "",
        vendorId: item.vendorId ?? "",
        vendorName: item.vendorName ?? "",
        purchaseType: item.purchaseType ?? "",
        catalogItemId: item.catalogItemId ?? "",
        itemName: item.itemName ?? "",
        quantity: String(item.quantity ?? ""),
        unit: item.unit ?? "",
        unitCost: String(item.unitCost ?? ""),
        invoiceNumber: item.invoiceNumber ?? "",
        paymentStatus: item.paymentStatus ?? "",
        purchaseDate: item.purchaseDate ?? "",
        remarks: item.remarks ?? "",
      },
    });
  };

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
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <View style={styles.heroIcon}>
                <Ionicons name="cart-outline" size={24} color="#FFF" />
              </View>
              <Text style={styles.heroItemName}>{item.itemName || item.purchaseType}</Text>
              <Text style={styles.heroAmount}>{formatAmount(item.totalAmount)}</Text>
              <View style={[styles.heroStatusPill, { backgroundColor: paymentStatusTone.bg, borderColor: paymentStatusTone.border }]}>
                <Text style={[styles.heroStatusText, { color: paymentStatusTone.color }]}>
                  {labelize(item.paymentStatus)}
                </Text>
              </View>
            </View>

            {/* Details Card */}
            <View style={styles.detailsCard}>
              <DetailRow label="Purchase Category" value={labelize(item.purchaseType)} />
              <View style={styles.divider} />
              <DetailRow label="Vendor" value={item.vendorName || "No Vendor"} />
              <View style={styles.divider} />
              <DetailRow label="Purchase Date" value={formatDate(item.purchaseDate)} />
              <View style={styles.divider} />
              <DetailRow label="Quantity" value={formatQuantity(item.quantity, item.unit)} />
              <View style={styles.divider} />
              <DetailRow label="Unit Cost" value={formatAmount(item.unitCost)} />
              <View style={styles.divider} />
              <DetailRow label="Total Amount" value={formatAmount(item.totalAmount)} />
              <View style={styles.divider} />
              <DetailRow label="Paid Amount" value={formatAmount(item.paidAmount)} />
              <View style={styles.divider} />
              <DetailRow label="Invoice Number" value={item.invoiceNumber || "--"} />
              {item.remarks ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.remarksBox}>
                    <Text style={styles.detailLabel}>Remarks</Text>
                    <Text style={styles.remarksText}>{item.remarks}</Text>
                  </View>
                </>
              ) : null}
            </View>

            {/* Metadata (timestamps) */}
            <View style={styles.timestampsCard}>
              <View>
                <Text style={styles.timestampLabel}>Created At</Text>
                <Text style={styles.timestampValue}>{formatDate(item.createdAt)}</Text>
              </View>
              <View style={styles.verticalDivider} />
              <View>
                <Text style={styles.timestampLabel}>Updated At</Text>
                <Text style={styles.timestampValue}>{formatDate(item.updatedAt)}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.editButton} onPress={handleEdit} activeOpacity={0.8}>
                <Ionicons name="create-outline" size={18} color="#FFF" />
                <Text style={styles.editButtonText}>Edit Purchase</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function getPaymentTone(status?: string | null) {
  switch (status) {
    case "PAID":
      return { color: THEME_GREEN, bg: "#E7F5ED", border: "#BFE6CD" };
    case "PARTIAL":
      return { color: "#B45309", bg: "#FFF7ED", border: "#FED7AA" };
    case "CANCELLED":
      return { color: Colors.error, bg: "#FEF2F2", border: "#FECACA" };
    default:
      return { color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" };
  }
}

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
  heroItemName: {
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
  heroStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
  },
  heroStatusText: {
    fontSize: 11,
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
  remarksBox: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  remarksText: {
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
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E2E8F0",
  },

  // Action Buttons
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: THEME_GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  editButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "900",
  },
});
