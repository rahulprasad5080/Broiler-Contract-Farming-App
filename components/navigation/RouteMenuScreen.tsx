import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { Layout } from "@/constants/Layout";

export type RouteMenuItem = {
  title: string;
  desc: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  route: Href;
};

export type RouteMenuInfoBanner = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

type RouteMenuScreenProps = {
  title: string;
  items: RouteMenuItem[];
  infoBanner?: RouteMenuInfoBanner;
  iconBackgroundColor?: string;
};

export function RouteMenuScreen({
  title,
  items,
  infoBanner,
  iconBackgroundColor = "#E8F5E9",
}: RouteMenuScreenProps) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {infoBanner ? (
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: infoBanner.backgroundColor,
                borderColor: infoBanner.borderColor,
              },
            ]}
          >
            <Ionicons name={infoBanner.icon} size={24} color={Colors.primary} />
            <Text style={[styles.infoText, { color: infoBanner.textColor }]}>
              {infoBanner.text}
            </Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          {items.map((item) => (
            <TouchableOpacity
              key={`${item.title}-${item.route.toString()}`}
              style={styles.card}
              onPress={() => router.push(item.route)}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: iconBackgroundColor },
                ]}
              >
                <Ionicons name={item.icon} size={28} color={Colors.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.textSecondary}
              />
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
    backgroundColor: "#F9FAFB",
  },
  header: {
    padding: Layout.spacing.lg,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
  },
  container: {
    padding: Layout.screenPadding,
    paddingBottom: 100,
    alignSelf: "center",
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
  },
  infoCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    marginBottom: Layout.spacing.lg,
    borderWidth: 1,
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  grid: {
    gap: Layout.spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: Layout.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
