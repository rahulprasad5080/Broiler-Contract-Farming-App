import { Ionicons } from "@expo/vector-icons";
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
import { useAuth, type Permission } from "@/context/AuthContext";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

type MenuItem = {
  title: string;
  desc: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  route: string;
  requiredPermission: Permission;
};

const menuItemsByPermission: MenuItem[] = [
  {
    title: "Daily Entry",
    desc: "Log mortality, feed, and weight",
    icon: "calendar-outline",
    color: "#3B82F6",
    route: "/(farmer)/tasks/daily",
    requiredPermission: "create:daily-entry",
  },
  {
    title: "Treatments",
    desc: "Log vaccines and medicines given",
    icon: "medical-outline",
    color: "#0EA5E9",
    route: "/(farmer)/tasks/treatments",
    requiredPermission: "create:treatments",
  },
  {
    title: "Expense Entry",
    desc: "Add electricity, labour, diesel and other expenses",
    icon: "receipt-outline",
    color: "#10B981",
    route: "/(farmer)/tasks/expenses",
    requiredPermission: "create:expenses",
  },
  {
    title: "Comments & Notes",
    desc: "View supervisor feedback and notes",
    icon: "chatbubbles-outline",
    color: "#F59E0B",
    route: "/(farmer)/tasks/comments",
    requiredPermission: "view:comments",
  },
  {
    title: "Sales Entry",
    desc: "Record birds sold and total weight",
    icon: "cart-outline",
    color: "#EF4444",
    route: "/(farmer)/tasks/sales",
    requiredPermission: "create:sales",
  },
];

export default function FarmerTasksIndexScreen() {
  const { hasPermission } = useAuth();
  const router = useRouter();

  const menuItems = menuItemsByPermission.filter((item) =>
    hasPermission(item.requiredPermission)
  );

  return (
    <View style={styles.safeArea}>
      <TopAppBar title="Tasks & Entries" subtitle="Daily work, treatments, expenses, and sales" />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {menuItems.length === 0 ? (
          <View style={styles.emptyWrap}>
            <ScreenState
              title="No actions available"
              message="Your current role does not have task permissions."
              icon="lock-closed-outline"
            />
          </View>
        ) : (
          <View style={styles.grid}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.card}
                onPress={() => router.navigate(item.route as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon} size={28} color={item.color} />
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
  safeArea: {
    flex: 1,
    backgroundColor: "#0B5C36", // Keep farmer theme green header background
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#F9FAFB", // Body color
    paddingTop: 16,
  },
  emptyWrap: {
    paddingHorizontal: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EAEAEA",
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    // Elevation for Android
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 15,
  },
});
