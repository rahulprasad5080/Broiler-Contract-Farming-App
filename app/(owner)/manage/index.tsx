import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";

import { ScreenState } from "@/components/ui/ScreenState";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { useAuth } from "@/context/AuthContext";
import { canShowForPermissions, type PermissionRequirement } from "@/services/permissionRules";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

type EntryItem = {
  title: string;
  desc: string;
  icon: any;
  iconType: "Ionicons" | "MaterialCommunityIcons";
  color: string;
  route: any;
  requiredPermission: PermissionRequirement;
};

const ENTRY_ITEMS: EntryItem[] = [
  {
    title: "Farms List",
    desc: "View and manage farms",
    icon: "business-outline",
    iconType: "Ionicons",
    color: "#059669",
    route: "/(owner)/manage/farms",
    requiredPermission: "manage:farms",
  },
  {
    title: "Batches List",
    desc: "View all batches",
    icon: "layers-outline",
    iconType: "Ionicons",
    color: "#2563EB",
    route: "/(owner)/manage/batches",
    requiredPermission: "manage:batches",
  },
  {
    title: "Daily Entry",
    desc: "Add mortality, feed, weight etc.",
    icon: "calendar-outline",
    iconType: "Ionicons",
    color: "#3B82F6",
    route: "/(owner)/manage/daily-entry",
    requiredPermission: "create:daily-entry",
  },
  {
    title: "Treatments",
    desc: "List and add batch treatments",
    icon: "medical-outline",
    iconType: "Ionicons",
    color: "#0EA5E9",
    route: "/(owner)/manage/treatments",
    requiredPermission: "create:treatments",
  },
  {
    title: "Inventory Allocation",
    desc: "Allocate feed, medicine etc.",
    icon: "cart-outline",
    iconType: "Ionicons",
    color: "#8B5CF6",
    route: "/(owner)/manage/allocate",
    requiredPermission: "manage:inventory",
  },
  {
    title: "Inventory List",
    desc: "View current stock",
    icon: "cube-outline",
    iconType: "Ionicons",
    color: "#7C3AED",
    route: "/(owner)/manage/inventory",
    requiredPermission: "manage:inventory",
  },
  {
    title: "Inventory Ledger",
    desc: "Stock movement history",
    icon: "swap-horizontal-outline",
    iconType: "Ionicons",
    color: "#9333EA",
    route: "/(owner)/manage/ledger",
    requiredPermission: "manage:inventory",
  },
  {
    title: "Expense Entry",
    desc: "Add company or farmer expenses",
    icon: "receipt-outline",
    iconType: "Ionicons",
    color: "#10B981",
    route: "/(owner)/manage/expenses",
    requiredPermission: "create:expenses",
  },
  {
    title: "Costs List",
    desc: "View batch costs",
    icon: "calculator-outline",
    iconType: "Ionicons",
    color: "#0F766E",
    route: "/(owner)/manage/costs",
    requiredPermission: "view:inventory-cost",
  },
  {
    title: "Sales Entry",
    desc: "Add sales & collection",
    icon: "cart-outline",
    iconType: "Ionicons",
    color: "#EF4444",
    route: "/(owner)/manage/sales",
    requiredPermission: "create:sales",
  },
  {
    title: "Purchases List",
    desc: "View purchase records",
    icon: "bag-handle-outline",
    iconType: "Ionicons",
    color: "#B45309",
    route: "/(owner)/manage/purchase",
    requiredPermission: "create:purchase",
  },
  {
    title: "Comments",
    desc: "View batch notes and corrections",
    icon: "chatbubbles-outline",
    iconType: "Ionicons",
    color: "#F59E0B",
    route: "/(owner)/manage/comments",
    requiredPermission: "view:comments",
  },
  {
    title: "Partner Master",
    desc: "Vendors & traders directory",
    icon: "people-outline",
    iconType: "Ionicons",
    color: "#0F766E",
    route: "/(owner)/manage/partners",
    requiredPermission: ["manage:partners", "create:sales"],
  },
  {
    title: "Item Master",
    desc: "Catalog items list",
    icon: "cube-outline",
    iconType: "Ionicons",
    color: "#0891B2",
    route: "/(owner)/manage/catalog",
    requiredPermission: "manage:catalog",
  },
  {
    title: "User Master",
    desc: "User management",
    icon: "person-add-outline",
    iconType: "Ionicons",
    color: "#4F46E5",
    route: "/(owner)/manage/users",
    requiredPermission: "manage:users",
  },
  {
    title: "Category Master",
    desc: "Master category values",
    icon: "list-outline",
    iconType: "Ionicons",
    color: "#64748B",
    route: "/(owner)/manage/dropdowns",
    requiredPermission: "manage:users",
  },
  {
    title: "Finance Entries",
    desc: "Investment, income, expense list and entry",
    icon: "document-text-outline",
    iconType: "Ionicons",
    color: "#4338CA",
    route: "/(owner)/manage/entries",
    requiredPermission: "view:financial-dashboard",
  },
  {
    title: "Payments List",
    desc: "Payment records",
    icon: "card-outline",
    iconType: "Ionicons",
    color: "#0D9488",
    route: "/(owner)/manage/payments",
    requiredPermission: "manage:settlements",
  },
  {
    title: "Settlement",
    desc: "Farmer settlement",
    icon: "document-text-outline",
    iconType: "Ionicons",
    color: "#EA580C",
    route: "/(owner)/manage/settlement",
    requiredPermission: "manage:settlements",
  },
  {
    title: "Profitability",
    desc: "Batch P&L summary",
    icon: "trending-up-outline",
    iconType: "Ionicons",
    color: "#15803D",
    route: "/(owner)/manage/profitability",
    requiredPermission: "view:inventory-cost",
  },
//   {
//     title: "Billing",
//     desc: "Plans and subscription",
//     icon: "wallet-outline",
//     iconType: "Ionicons",
//     color: "#16A34A",
//     route: "/(owner)/manage/billing",
//     requiredPermission: "view:financial-dashboard",
//   },
];

export default function EntriesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const visibleItems = ENTRY_ITEMS.filter((item) =>
    canShowForPermissions(user?.permissions ?? [], item.requiredPermission),
  );

  const renderIcon = (item: EntryItem) => {
    if (item.iconType === "Ionicons") {
      return <Ionicons name={item.icon} size={28} color={item.color} />;
    }
    return <MaterialCommunityIcons name={item.icon} size={28} color={item.color} />;
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Entries"
        subtitle="Create operational and financial records"
        leadingMode="back"
        onBack={() => router.replace('/(owner)/dashboard')}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {visibleItems.length === 0 ? (
          <View style={styles.emptyWrap}>
            <ScreenState title="No entries available" message="Your role does not have entry permissions." icon="lock-closed-outline" />
          </View>
        ) : (
          <View style={styles.grid}>
            {visibleItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.card}
                onPress={() => router.navigate(item.route)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                  {renderIcon(item)}
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F6F8" },
  scrollContainer: { flexGrow: 1, backgroundColor: "#F9FAFB", paddingTop: 16 },
  emptyWrap: { paddingHorizontal: 16 },
  grid: {
    flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, justifyContent: "space-between",
  },
  card: {
    width: CARD_WIDTH, backgroundColor: "#FFF", borderRadius: 12, padding: 14, marginBottom: 16,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EAEAEA",
    // Shadow for iOS
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8,
    // Elevation for Android
    elevation: 2,
  },
  iconContainer: {
    width: 48, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  cardTitle: { fontSize: 13, fontWeight: "700", color: "#111827", textAlign: "center", marginBottom: 4 },
  cardDesc: { fontSize: 11, color: "#6B7280", textAlign: "center", lineHeight: 15 },
});
