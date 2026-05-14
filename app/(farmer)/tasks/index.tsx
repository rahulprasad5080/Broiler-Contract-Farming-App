import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth, type Permission } from "@/context/AuthContext";

type MenuItem = {
  title: string;
  desc: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  route: string;
  requiredPermission: Permission;
};

const menuItemsByPermission: MenuItem[] = [
  {
    title: "Daily Entry",
    desc: "Log mortality, feed, and weight",
    icon: "clipboard-outline",
    route: "/(farmer)/tasks/daily",
    requiredPermission: "create:daily-entry",
  },
  {
    title: "Treatments",
    desc: "Log vaccines and medicines given",
    icon: "medical-outline",
    route: "/(farmer)/tasks/treatments",
    requiredPermission: "create:treatments",
  },
  {
    title: "Expense Entry",
    desc: "Add electricity, labour, diesel and other expenses",
    icon: "receipt-outline",
    route: "/(farmer)/tasks/expenses",
    requiredPermission: "create:expenses",
  },
  {
    title: "Comments & Notes",
    desc: "View supervisor feedback and notes",
    icon: "chatbubbles-outline",
    route: "/(farmer)/tasks/comments",
    requiredPermission: "view:comments",
  },
  {
    title: "Sales Entry",
    desc: "Record birds sold and total weight",
    icon: "cash-outline",
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
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B5C36" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks & Entries</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Menu Grid */}
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              onPress={() => router.navigate(item.route as any)}
            >
              <View style={styles.iconBox}>
                <Ionicons name={item.icon} size={28} color="#0B5C36" />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B5C36",
  },
  header: {
    backgroundColor: "#0B5C36",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#E7F5ED",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  cardDesc: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 16,
  },
});
