import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { ScreenState } from "@/components/ui/ScreenState";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { useAuth } from "@/context/AuthContext";
import { getRequestErrorMessage, showRequestErrorToast } from "@/services/apiFeedback";
import {
  listNotifications,
  markNotificationRead,
  type ApiNotification
} from "@/services/notificationApi";
import { resolveNotificationRoute } from "@/services/notificationRouting";

type NotificationGroup = {
  title: string;
  data: ApiNotification[];
};

//new 
export function NotificationsScreen() {
  const { accessToken, user } = useAuth();
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<"All" | "Unread" | "Important">("All");
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingIds, setMarkingIds] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = React.useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const response = await listNotifications(accessToken, {
        unreadOnly: selectedFilter === "Unread" ? true : undefined,
      });
      setNotifications(response.data);
    } catch (err) {
      setError(getRequestErrorMessage(err, "Unable to load notifications."));
      showRequestErrorToast(err, { title: "Unable to load notifications" });
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedFilter]);

  useFocusEffect(
    React.useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );

  const handleNotificationPress = React.useCallback(async (notification: ApiNotification) => {
    if (!accessToken) return;

    const navigateToTarget = () => {
      if (!user?.role) return;

      router.navigate(
        resolveNotificationRoute({
          role: user.role,
          data: notification as unknown as Record<string, unknown>,
        }).href as never,
      );
    };

    if (notification.isRead || markingIds[notification.id]) {
      navigateToTarget();
      return;
    }

    setMarkingIds((current) => ({ ...current, [notification.id]: true }));
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, isRead: true } : item,
      ),
    );

    try {
      const updated = await markNotificationRead(accessToken, notification.id);
      setNotifications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      navigateToTarget();
    } catch (err) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, isRead: false } : item,
        ),
      );
      showRequestErrorToast(err, { title: "Unable to mark notification read" });
    } finally {
      setMarkingIds((current) => {
        const next = { ...current };
        delete next[notification.id];
        return next;
      });
    }
  }, [accessToken, markingIds, user?.role, router]);

  const handleMarkAllRead = React.useCallback(async () => {
    const unreadNotifications = notifications.filter((n) => !n.isRead);
    if (!accessToken || unreadNotifications.length === 0) return;

    // Optimistic UI update
    setNotifications((current) =>
      current.map((n) => ({ ...n, isRead: true })),
    );

    try {
      await Promise.all(
        unreadNotifications.map((n) => markNotificationRead(accessToken, n.id))
      );
      void loadNotifications();
    } catch (err) {
      void loadNotifications();
      showRequestErrorToast(err, { title: "Unable to mark all notifications read" });
    }
  }, [accessToken, notifications, loadNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = useMemo(() => {
    let list = [...notifications];
    if (selectedFilter === "Unread") list = list.filter(n => !n.isRead);
    if (selectedFilter === "Important") {
      list = list.filter(n => n.severity === "WARNING" || n.severity === "CRITICAL");
    }
    return list;
  }, [notifications, selectedFilter]);

  const sections = useMemo(() => {
    const today: ApiNotification[] = [];
    const yesterday: ApiNotification[] = [];
    const earlier: ApiNotification[] = [];

    const now = new Date();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(now.getDate() - 1);

    filteredNotifications.forEach(n => {
      const d = new Date(n.createdAt);
      if (d.toDateString() === now.toDateString()) today.push(n);
      else if (d.toDateString() === yesterdayDate.toDateString()) yesterday.push(n);
      else earlier.push(n);
    });

    const groups: NotificationGroup[] = [];
    if (today.length) groups.push({ title: "Today", data: today });
    if (yesterday.length) groups.push({ title: "Yesterday", data: yesterday });
    if (earlier.length) groups.push({ title: "Earlier", data: earlier });
    return groups;
  }, [filteredNotifications]);

  const getIconMeta = (type: string, severity: string) => {
    if (severity === "CRITICAL") {
      return { icon: "alert-circle", color: "#EF4444", bg: "#FEE2E2", isCritical: true };
    }

    switch (type) {
      case "MORTALITY_ALERT":
        return { icon: "alert-circle-outline", color: "#EF4444", bg: "#FEE2E2" };
      case "FEED_ALERT":
        return { icon: "nutrition-outline", color: "#D97706", bg: "#FEF3C7" };
      case "VACCINE_DUE":
        return { icon: "medical-outline", color: "#8B5CF6", bg: "#EDE9FE" };
      case "FCR_ALERT":
        return { icon: "trending-up-outline", color: "#EC4899", bg: "#FCE7F3" };
      case "PENDING_ENTRY":
        return { icon: "document-text-outline", color: "#3B82F6", bg: "#DBEAFE" };
      case "SALES_READY":
        return { icon: "cart-outline", color: "#10B981", bg: "#D1FAE5" };
      case "PAYMENT_DUE":
        return { icon: "cash-outline", color: "#059669", bg: "#ECFDF5" };
      case "GENERAL":
      default:
        return { icon: "notifications-outline", color: "#6B7280", bg: "#F3F4F6" };
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getNotificationMeta = (item: ApiNotification) =>
    [
      item.type,
      item.severity,
      item.targetType && item.targetId ? `${item.targetType}: ${item.targetId}` : null,
      item.farmId ? `Farm: ${item.farmId}` : null,
      item.batchId ? `Batch: ${item.batchId}` : null,
      item.isRead ? "Read" : "Unread",
    ].filter(Boolean) as string[];

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Notifications"
        subtitle={`${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`}
        right={
          unreadCount > 0 ? (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={() => void handleMarkAllRead()}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-done" size={20} color="#FFF" />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
      <View style={styles.container}>
        {/* Filter Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, selectedFilter === "All" && styles.tabActive]}
            onPress={() => setSelectedFilter("All")}
          >
            <Text style={[styles.tabText, selectedFilter === "All" && styles.tabTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedFilter === "Unread" && styles.tabActive]}
            onPress={() => setSelectedFilter("Unread")}
          >
            <Text style={[styles.tabText, selectedFilter === "Unread" && styles.tabTextActive]}>Unread</Text>
            {unreadCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedFilter === "Important" && styles.tabActive]}
            onPress={() => setSelectedFilter("Important")}
          >
            <Text style={[styles.tabText, selectedFilter === "Important" && styles.tabTextActive]}>Important</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.stateWrap}>
            <ScreenState
              title="Unable to load notifications"
              message={error}
              icon="alert-circle-outline"
              tone="error"
              actionLabel="Retry"
              onAction={() => void loadNotifications()}
            />
          </View>
        ) : loading ? (
          <View style={styles.stateWrap}>
            <ScreenState title="Loading notifications" message="Checking latest alerts." loading />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderSectionHeader={({ section: { title } }) => (
              <Text style={styles.sectionHeader}>{title}</Text>
            )}
            renderItem={({ item, index, section }) => {
              const meta = getIconMeta(item.type, item.severity);
              const isLast = index === section.data.length - 1;
              return (
                <TouchableOpacity
                  style={[
                    styles.notifCard,
                    isLast && { borderBottomWidth: 0 },
                    meta.isCritical && styles.criticalCard,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => void handleNotificationPress(item)}
                >
                  <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon as any} size={22} color={meta.color} />
                  </View>
                  <View style={styles.notifContent}>
                    <View style={styles.notifHeaderRow}>
                      <View style={styles.titleWrap}>
                        <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
                        {item.severity === "CRITICAL" && (
                          <View style={styles.criticalBadge}>
                            <Text style={styles.criticalBadgeText}>CRITICAL</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
                    <View style={styles.metaWrap}>
                      {getNotificationMeta(item).map((metaItem) => (
                        <View key={metaItem} style={styles.metaPill}>
                          <Text style={styles.metaPillText} numberOfLines={1}>{metaItem}</Text>
                        </View>
                      ))}
                    </View>
                    {(item.readAt || item.readById) ? (
                      <Text style={styles.readMeta} numberOfLines={1}>
                        {item.readAt ? `Read at ${formatTime(item.readAt)}` : "Read"}
                        {item.readById ? ` by ${item.readById}` : ""}
                      </Text>
                    ) : null}
                  </View>
                  {!item.isRead ? (
                    <View style={styles.unreadDot} />
                  ) : (
                    <Ionicons name="checkmark-done" size={16} color="#9CA3AF" style={{ marginLeft: 12 }} />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <ScreenState
                title="No notifications"
                message="New alerts and updates will appear here."
                icon="notifications-outline"
              />
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  tabsRow: {
    flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, gap: 10,
  },
  tab: {
    flex: 1, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E7EB", flexDirection: "row",
  },
  tabActive: { backgroundColor: "#0B5C36", borderColor: "#0B5C36" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#FFF" },
  tabBadge: {
    backgroundColor: "#EF4444", borderRadius: 10, minWidth: 18, height: 18,
    alignItems: "center", justifyContent: "center", marginLeft: 6, paddingHorizontal: 4,
  },
  tabBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "700" },
  stateWrap: {
    padding: 16,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1 },
  sectionHeader: {
    fontSize: 14, fontWeight: "700", color: "#111827", marginTop: 20, marginBottom: 12,
  },
  notifCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFF",
    padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
    borderRadius: 8, marginBottom: 4,
    borderLeftWidth: 3, borderLeftColor: "transparent",
  },
  criticalCard: {
    borderLeftColor: "#EF4444",
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 16,
  },
  notifContent: { flex: 1 },
  notifHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  titleWrap: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8, gap: 6 },
  notifTitle: { fontSize: 15, fontWeight: "700", color: "#111827", flexShrink: 1 },
  criticalBadge: {
    backgroundColor: "#FEE2E2",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  criticalBadgeText: {
    color: "#EF4444",
    fontSize: 8,
    fontWeight: "900",
  },
  notifTime: { fontSize: 11, color: "#9CA3AF" },
  notifMessage: { fontSize: 13, color: "#6B7280", lineHeight: 18 },
  metaWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  metaPill: {
    maxWidth: "100%",
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaPillText: {
    color: "#6B7280",
    fontSize: 10,
    fontWeight: "800",
  },
  readMeta: {
    marginTop: 6,
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "700",
  },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444", marginLeft: 12 },
  markAllBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
});
