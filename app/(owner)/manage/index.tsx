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
    title: "Daily Entry",
    desc: "Add mortality, feed, weight etc.",
    icon: "calendar-outline",
    iconType: "Ionicons",
    color: "#3B82F6",
    route: "/(owner)/manage/daily-entry/form",
    requiredPermission: "create:daily-entry",
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
    title: "Inventory Stock",
    desc: "View current stock",
    icon: "cube-outline",
    iconType: "Ionicons",
    color: "#7C3AED",
    route: "/(owner)/manage/inventory",
    requiredPermission: "manage:inventory",
  },
  {
    title: "Expense Entry",
    desc: "Add company or farmer expenses",
    icon: "receipt-outline",
    iconType: "Ionicons",
    color: "#10B981",
    route: "/(owner)/manage/expenses/create",
    requiredPermission: "create:expenses",
  },
  {
    title: "Sale Entry",
    desc: "Add sales and collections",
    icon: "cart-outline",
    iconType: "Ionicons",
    color: "#EF4444",
    route: "/(owner)/manage/sales/create",
    requiredPermission: "create:sales",
  },
  {
    title: "Payment Entry",
    desc: "Record outgoing payments",
    icon: "card-outline",
    iconType: "Ionicons",
    color: "#0D9488",
    route: "/(owner)/manage/payments/create",
    requiredPermission: "manage:settlements",
  },
  {
    title: "Receipt Entry",
    desc: "Record incoming receipts",
    icon: "cash-outline",
    iconType: "Ionicons",
    color: "#16A34A",
    route: "/(owner)/manage/entries/create?type=OTHER_INCOME",
    requiredPermission: "view:financial-dashboard",
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
    title: "Costs",
    desc: "View batch costs",
    icon: "calculator-outline",
    iconType: "Ionicons",
    color: "#0F766E",
    route: "/(owner)/manage/costs",
    requiredPermission: "view:inventory-cost",
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
