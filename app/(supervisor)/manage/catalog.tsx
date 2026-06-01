import { ScreenState } from "@/components/ui/ScreenState";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import {
  showRequestErrorToast,
} from "@/services/apiFeedback";
import {
  listCatalogItems,
  type ApiCatalogItem,
} from "@/services/managementApi";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function SupervisorCatalogScreen() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<ApiCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCatalog = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await listCatalogItems(accessToken, { limit: 100 });
      setItems(response.data);
    } catch (error) {
      showRequestErrorToast(error, {
        title: "Unable to load catalog",
        fallbackMessage: "Failed to fetch catalog items.",
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadCatalog();
    }, [loadCatalog]),
  );

  return (
    <View style={styles.safeArea}>
      <TopAppBar title="Catalog" subtitle="Catalog items list" />
      <FlatList
        data={loading ? [] : items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.container, !loading && !items.length && styles.empty]}
        ListHeaderComponent={
          loading ? (
            <ScreenState title="Loading catalog" message="Fetching catalog items." loading compact />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.copy}>
                <Text style={styles.title}>{item.name}</Text>
                <Text style={styles.meta}>
                  {[item.type, item.sku, item.unit, item.manufacturer].filter(Boolean).join(" | ")}
                </Text>
                <Text style={styles.meta}>
                  Stock {Number(item.currentStock ?? 0).toLocaleString("en-IN")} {item.unit}
                  {item.reorderLevel ? ` | Reorder ${item.reorderLevel}` : ""}
                </Text>
              </View>
              <View style={[styles.badge, item.isActive === false && styles.badgeOff]}>
                <Text style={[styles.badgeText, item.isActive === false && styles.badgeTextOff]}>
                  {item.isActive === false ? "Inactive" : "Active"}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <ScreenState title="No catalog items" message="No catalog items found." icon="cube-outline" />
          ) : null
        }
        ListFooterComponent={
          loading && items.length ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <View style={{ height: 24 }} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  container: {
    padding: 14,
    paddingBottom: 48,
  },
  empty: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    gap: 12,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  meta: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: "#E8F5E9",
  },
  badgeOff: {
    backgroundColor: "#FEF2F2",
  },
  badgeText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  badgeTextOff: {
    color: Colors.error,
  },
});
