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

import { Colors } from "@/constants/Colors";
import { Layout } from "@/constants/Layout";
import { TopAppBar } from "@/components/ui/TopAppBar";

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
    <View style={styles.safeArea}>
      <TopAppBar title={title} eyebrow="Entries" leadingMode="back" />

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
              onPress={() => router.navigate(item.route)}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: iconBackgroundColor },
                ]}
              >
                <Ionicons name={item.icon} size={28} color={Colors.primary} />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B5C36",
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    width: Layout.isSmallDevice ? "100%" : "48%",
    minHeight: 164,
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    textAlign: "center",
  },
});
