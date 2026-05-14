import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { showRequestErrorToast } from "@/services/apiFeedback";
import {
  listNotifications,
  type ApiNotification
} from "@/services/notificationApi";

type NotificationGroup = {
  title: string;
  data: ApiNotification[];
};

export function NotificationsScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<"All" | "Unread" | "Important">("All");
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = React.useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await listNotifications(accessToken);
      setNotifications(response.data);
    } catch (err) {
      showRequestErrorToast(err, { title: "Unable to load notifications" });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  React.useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = useMemo(() => {
    let list = [...notifications];
    if (selectedFilter === "Unread") list = list.filter(n => !n.isRead);
    // Add logic for "Important" if needed, currently showing all as important might be too much
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

  const getIconMeta = (type: string) => {
    switch (type) {
      case 'FEED_ALERT': return { icon: 'nutrition-outline', color: '#F59E0B', bg: '#FEF3C7' };
      case 'MORTALITY_ALERT': return { icon: 'alert-circle-outline', color: '#F59E0B', bg: '#FEF3C7' };
      case 'SALES_READY': return { icon: 'cart-outline', color: '#10B981', bg: '#D1FAE5' };
      default: return { icon: 'notifications-outline', color: '#6B7280', bg: '#F3F4F6' };
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B5C36" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>

          <Text style={styles.headerTitle}>Notifications</Text>
        </View>

      </View>

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

        {loading ? (
          <ActivityIndicator color="#0B5C36" style={{ marginTop: 40 }} />
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderSectionHeader={({ section: { title } }) => (
              <Text style={styles.sectionHeader}>{title}</Text>
            )}
            renderItem={({ item, index, section }) => {
              const meta = getIconMeta(item.type);
              const isLast = index === section.data.length - 1;
              return (
                <TouchableOpacity
                  style={[styles.notifCard, isLast && { borderBottomWidth: 0 }]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon as any} size={22} color={meta.color} />
                  </View>
                  <View style={styles.notifContent}>
                    <View style={styles.notifHeaderRow}>
                      <Text style={styles.notifTitle}>{item.title}</Text>
                      <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
                  </View>
                  {!item.isRead && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
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
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerBtn: { padding: 4 },
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "700", marginLeft: 12 },
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
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionHeader: {
    fontSize: 14, fontWeight: "700", color: "#111827", marginTop: 20, marginBottom: 12,
  },
  notifCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFF",
    padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
    borderRadius: 12, marginBottom: 2, // Using minor margin for section grouped look
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 16,
  },
  notifContent: { flex: 1 },
  notifHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  notifTitle: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1, marginRight: 8 },
  notifTime: { fontSize: 11, color: "#9CA3AF" },
  notifMessage: { fontSize: 13, color: "#6B7280", lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444", marginLeft: 12 },
});
