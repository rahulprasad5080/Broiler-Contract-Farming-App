import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

type EntryItem = {
  title: string;
  desc: string;
  icon: any;
  iconType: "Ionicons" | "MaterialCommunityIcons";
  color: string;
  route: any;
};

const ENTRY_ITEMS: EntryItem[] = [
  {
    title: "Daily Entry",
    desc: "Add mortality, feed, weight etc.",
    icon: "calendar-outline",
    iconType: "Ionicons",
    color: "#3B82F6",
    route: "/(owner)/manage/daily-entry",
  },
  {
    title: "Inventory Allocation",
    desc: "Allocate feed, medicine etc.",
    icon: "cart-outline",
    iconType: "Ionicons",
    color: "#8B5CF6",
    route: "/(owner)/manage/inventory/allocate",
  },
  {
    title: "Expense Entry",
    desc: "Add company or farmer expenses",
    icon: "receipt-outline",
    iconType: "Ionicons",
    color: "#10B981",
    route: "/(owner)/manage/expenses",
  },
  {
    title: "Sales Entry",
    desc: "Add sales & collection",
    icon: "cart-outline",
    iconType: "Ionicons",
    color: "#EF4444",
    route: "/(owner)/manage/sales",
  },
  {
    title: "Purchase Entry",
    desc: "Add purchases & payments",
    icon: "bag-outline",
    iconType: "Ionicons",
    color: "#F59E0B",
    route: "/(owner)/manage/inventory/purchase",
  },
  {
    title: "Investment Entry",
    desc: "Add investments",
    icon: "document-text-outline",
    iconType: "Ionicons",
    color: "#6366F1",
    route: "/(owner)/manage/financials",
  },
];

export default function EntriesScreen() {
  const router = useRouter();

  const renderIcon = (item: EntryItem) => {
    if (item.iconType === "Ionicons") {
      return <Ionicons name={item.icon} size={28} color={item.color} />;
    }
    return <MaterialCommunityIcons name={item.icon} size={28} color={item.color} />;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B5C36" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Entries</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <View>
            <Ionicons name="notifications-outline" size={24} color="#FFF" />
            <View style={styles.notifDot} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {ENTRY_ITEMS.map((item, index) => (
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
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "700" },
  headerBtn: { padding: 4 },
  notifDot: {
    position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#EF4444", borderWidth: 1.5, borderColor: "#0B5C36",
  },
  scrollContainer: { flexGrow: 1, backgroundColor: "#F9FAFB", paddingTop: 20 },
  grid: {
    flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, justifyContent: "space-between",
  },
  card: {
    width: CARD_WIDTH, backgroundColor: "#FFF", borderRadius: 16, padding: 20, marginBottom: 16,
    alignItems: "center", justifyContent: "center",
    // Shadow for iOS
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8,
    // Elevation for Android
    elevation: 2,
  },
  iconContainer: {
    width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111827", textAlign: "center", marginBottom: 6 },
  cardDesc: { fontSize: 12, color: "#6B7280", textAlign: "center", lineHeight: 18 },
});
