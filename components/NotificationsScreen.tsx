import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { Layout } from "@/constants/Layout";
import { useAuth } from "@/context/AuthContext";

type NotificationType =
  | "mortality"
  | "feed"
  | "vaccine"
  | "fcr"
  | "pending"
  | "sales";

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  farm: string;
  createdAt: string;
  unread: boolean;
};

const notifications: NotificationItem[] = [
  {
    id: "sales-ready-01",
    type: "sales",
    title: "Sales Ready",
    body: "Batch B-104 has crossed target weight and is ready for sale planning.",
    farm: "Green Valley Farm",
    createdAt: "2026-05-11T17:45:00+05:30",
    unread: true,
  },
  {
    id: "pending-entries-01",
    type: "pending",
    title: "Pending Entries",
    body: "Daily entry is still pending for House #04.",
    farm: "River Edge Co.",
    createdAt: "2026-05-11T16:20:00+05:30",
    unread: true,
  },
  {
    id: "mortality-01",
    type: "mortality",
    title: "Mortality Alert",
    body: "Mortality count is above the expected range for Day 28.",
    farm: "Highland Broilers",
    createdAt: "2026-05-11T14:05:00+05:30",
    unread: true,
  },
  {
    id: "feed-01",
    type: "feed",
    title: "Feed Alert",
    body: "Feed stock may run low within 2 days based on current consumption.",
    farm: "Sunrise Poultry",
    createdAt: "2026-05-11T10:40:00+05:30",
    unread: false,
  },
  {
    id: "vaccine-01",
    type: "vaccine",
    title: "Vaccine Due",
    body: "Lasota vaccine is due tomorrow for the active batch.",
    farm: "Green Valley Farm",
    createdAt: "2026-05-10T18:00:00+05:30",
    unread: true,
  },
  {
    id: "fcr-01",
    type: "fcr",
    title: "FCR Alert",
    body: "FCR trend needs review against batch performance target.",
    farm: "Highland Broilers",
    createdAt: "2026-05-10T12:30:00+05:30",
    unread: false,
  },
];

const typeMeta: Record<
  NotificationType,
  {
    label: string;
    icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    accent: string;
    soft: string;
  }
> = {
  mortality: {
    label: "Mortality",
    icon: "alert-circle-outline",
    accent: Colors.tertiary,
    soft: "#FFF4F4",
  },
  feed: {
    label: "Feed",
    icon: "silverware-fork",
    accent: "#B7791F",
    soft: "#FFF8E1",
  },
  vaccine: {
    label: "Vaccine",
    icon: "needle",
    accent: "#1565C0",
    soft: "#E3F2FD",
  },
  fcr: {
    label: "FCR",
    icon: "chart-line",
    accent: "#7C3AED",
    soft: "#F5F3FF",
  },
  pending: {
    label: "Pending",
    icon: "clipboard-clock-outline",
    accent: "#D97706",
    soft: "#FFF7ED",
  },
  sales: {
    label: "Sales Ready",
    icon: "cash-fast",
    accent: Colors.primary,
    soft: "#E8F5E9",
  },
};

const filters: Array<"all" | NotificationType> = [
  "all",
  "mortality",
  "feed",
  "vaccine",
  "fcr",
  "pending",
  "sales",
];

function formatTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRelatedRoute(role: string | null | undefined, type: NotificationType) {
  if (role === "OWNER") {
    if (type === "feed") return "/(owner)/manage/inventory";
    if (type === "fcr") return "/(owner)/reports";
    if (type === "sales") return "/(owner)/manage/sales";
    return "/(owner)/manage/daily-entry";
  }

  if (role === "SUPERVISOR") {
    if (type === "vaccine") return "/(supervisor)/tasks/treatments";
    if (type === "fcr") return "/(supervisor)/reports";
    if (type === "sales") return "/(supervisor)/tasks/sales";
    if (type === "pending") return "/(supervisor)/review";
    return "/(supervisor)/tasks/daily";
  }

  if (type === "vaccine") return "/(farmer)/tasks/treatments";
  if (type === "fcr") return "/(farmer)/reports";
  if (type === "sales") return "/(farmer)/tasks/sales";
  return "/(farmer)/tasks/daily";
}

export function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] =
    useState<(typeof filters)[number]>("all");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const orderedNotifications = useMemo(
    () =>
      [...notifications]
        .sort(
          (first, second) =>
            new Date(second.createdAt).getTime() -
            new Date(first.createdAt).getTime(),
        )
        .filter((item) =>
          selectedFilter === "all" ? true : item.type === selectedFilter,
        ),
    [selectedFilter],
  );

  const unreadCount = notifications.filter(
    (item) => item.unread && !readIds.has(item.id),
  ).length;

  const openNotification = (item: NotificationItem) => {
    setReadIds((current) => new Set(current).add(item.id));
    router.push(getRelatedRoute(user?.role, item.type) as never);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSub}>Central alert management</Text>
        </View>
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>Farm Alerts</Text>
          <Text style={styles.summaryText}>
            Latest updates for mortality, feed, vaccines, FCR, entries, and sales.
          </Text>
        </View>
      </View>

      <FlatList
        data={orderedNotifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <FlatList
            horizontal
            data={filters}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.filterRow}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => {
              const active = selectedFilter === item;
              const label = item === "all" ? "All" : typeMeta[item].label;

              return (
                <TouchableOpacity
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setSelectedFilter(item)}
                  activeOpacity={0.82}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        }
        renderItem={({ item }) => {
          const meta = typeMeta[item.type];
          const unread = item.unread && !readIds.has(item.id);

          return (
            <TouchableOpacity
              style={[styles.alertCard, unread && styles.alertCardUnread]}
              onPress={() => openNotification(item)}
              activeOpacity={0.86}
            >
              <View style={[styles.alertIcon, { backgroundColor: meta.soft }]}>
                <MaterialCommunityIcons
                  name={meta.icon}
                  size={22}
                  color={meta.accent}
                />
              </View>
              <View style={styles.alertCopy}>
                <View style={styles.alertTitleRow}>
                  <Text style={styles.alertTitle}>{item.title}</Text>
                  {unread ? <View style={styles.unreadDot} /> : null}
                </View>
                <Text style={styles.alertBody}>{item.body}</Text>
                <View style={styles.alertFooter}>
                  <Text style={styles.alertFarm}>{item.farm}</Text>
                  <Text style={styles.alertTime}>{formatTime(item.createdAt)}</Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    marginRight: 14,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  headerSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  unreadBadge: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#CBE6D5",
  },
  unreadBadgeText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: Layout.screenPadding,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: "#DDEBE3",
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
  },
  summaryCopy: {
    flex: 1,
  },
  summaryTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  summaryText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: 100,
  },
  filterRow: {
    gap: 8,
    paddingTop: 14,
    paddingBottom: 10,
  },
  filterChip: {
    minHeight: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: "#E2E8E5",
  },
  alertCardUnread: {
    borderColor: "#CBE6D5",
    backgroundColor: "#FBFEFC",
  },
  alertIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  alertCopy: {
    flex: 1,
  },
  alertTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  alertTitle: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.tertiary,
  },
  alertBody: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  alertFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 8,
  },
  alertFarm: {
    flex: 1,
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "800",
  },
  alertTime: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
});
