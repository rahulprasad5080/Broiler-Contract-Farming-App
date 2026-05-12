import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import {
  listNotifications,
  markNotificationRead,
  type ApiNotification,
  type ApiNotificationType,
} from "@/services/notificationApi";
import { showRequestErrorToast } from "@/services/apiFeedback";

const typeMeta: Record<
  ApiNotificationType,
  {
    label: string;
    icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    accent: string;
    soft: string;
  }
> = {
  MORTALITY_ALERT: {
    label: "Mortality",
    icon: "alert-circle-outline",
    accent: Colors.tertiary,
    soft: "#FFF4F4",
  },
  FEED_ALERT: {
    label: "Feed",
    icon: "silverware-fork",
    accent: "#B7791F",
    soft: "#FFF8E1",
  },
  VACCINE_DUE: {
    label: "Vaccine",
    icon: "needle",
    accent: "#1565C0",
    soft: "#E3F2FD",
  },
  FCR_ALERT: {
    label: "FCR",
    icon: "chart-line",
    accent: "#7C3AED",
    soft: "#F5F3FF",
  },
  PENDING_ENTRY: {
    label: "Pending",
    icon: "clipboard-clock-outline",
    accent: "#D97706",
    soft: "#FFF7ED",
  },
  SALES_READY: {
    label: "Sales Ready",
    icon: "cash-fast",
    accent: Colors.primary,
    soft: "#E8F5E9",
  },
  PAYMENT_DUE: {
    label: "Payment",
    icon: "cash-clock",
    accent: "#B7791F",
    soft: "#FFF8E1",
  },
  GENERAL: {
    label: "General",
    icon: "bell-outline",
    accent: Colors.primary,
    soft: "#E8F5E9",
  },
};

const filters: ("all" | ApiNotificationType)[] = [
  "all",
  "MORTALITY_ALERT",
  "FEED_ALERT",
  "VACCINE_DUE",
  "FCR_ALERT",
  "PENDING_ENTRY",
  "SALES_READY",
  "PAYMENT_DUE",
  "GENERAL",
];

function formatTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRelatedRoute(role: string | null | undefined, type: ApiNotificationType) {
  if (role === "OWNER" || role === "ACCOUNTS") {
    if (type === "FEED_ALERT") return "/(owner)/manage/inventory";
    if (type === "FCR_ALERT") return "/(owner)/reports";
    if (type === "SALES_READY") return "/(owner)/manage/sales";
    if (type === "PAYMENT_DUE") return "/(owner)/manage/settlement";
    return "/(owner)/manage/daily-entry";
  }

  if (role === "SUPERVISOR") {
    if (type === "VACCINE_DUE") return "/(supervisor)/tasks/treatments";
    if (type === "FCR_ALERT") return "/(supervisor)/reports";
    if (type === "SALES_READY") return "/(supervisor)/tasks/sales";
    if (type === "PENDING_ENTRY") return "/(supervisor)/review";
    return "/(supervisor)/tasks/daily";
  }

  if (type === "VACCINE_DUE") return "/(farmer)/tasks/treatments";
  if (type === "FCR_ALERT") return "/(farmer)/reports";
  if (type === "SALES_READY") return "/(farmer)/tasks/sales";
  return "/(farmer)/tasks/daily";
}

export function NotificationsScreen() {
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const [selectedFilter, setSelectedFilter] =
    useState<(typeof filters)[number]>("all");
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = React.useCallback(async () => {
    if (!accessToken) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await listNotifications(accessToken);
      setNotifications(response.data);
    } catch (err) {
      setError(
        showRequestErrorToast(err, {
          title: "Unable to load notifications",
          fallbackMessage: "Failed to load notifications.",
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

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
    [notifications, selectedFilter],
  );

  const unreadCount = notifications.filter(
    (item) => !item.isRead,
  ).length;

  const openNotification = async (item: ApiNotification) => {
    if (accessToken && !item.isRead) {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === item.id
            ? { ...notification, isRead: true, readAt: new Date().toISOString() }
            : notification,
        ),
      );

      try {
        const updated = await markNotificationRead(accessToken, item.id);
        setNotifications((current) =>
          current.map((notification) =>
            notification.id === updated.id ? updated : notification,
          ),
        );
      } catch (err) {
        showRequestErrorToast(err, {
          title: "Unable to mark read",
          fallbackMessage: "Notification opened, but read status was not saved.",
        });
      }
    }

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

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={orderedNotifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={() => void loadNotifications()}
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
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.emptyText}>Loading notifications...</Text>
            </View>
          ) : (
            <View style={styles.loadingState}>
              <Ionicons name="notifications-off-outline" size={28} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>No notifications found.</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const meta = typeMeta[item.type];
          const unread = !item.isRead;

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
                <Text style={styles.alertBody}>{item.message}</Text>
                <View style={styles.alertFooter}>
                  <Text style={styles.alertFarm}>
                    {[item.farmId ? "Farm linked" : null, item.batchId ? "Batch linked" : null]
                      .filter(Boolean)
                      .join(" | ") || typeMeta[item.type].label}
                  </Text>
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
  errorText: {
    marginHorizontal: Layout.screenPadding,
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#FFF4F4",
    color: Colors.tertiary,
    borderWidth: 1,
    borderColor: "#FECACA",
    fontSize: 12,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: 100,
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 34,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
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
