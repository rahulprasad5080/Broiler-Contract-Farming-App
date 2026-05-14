import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors } from "@/constants/Colors";

type TopAppBarProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  showBack?: boolean;
  showNotificationBell?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
};

const APP_BAR_GREEN = "#0B5C36";

export function TopAppBar({
  title,
  subtitle,
  eyebrow,
  showBack = false,
  showNotificationBell = false,
  onBack,
  right,
}: TopAppBarProps) {
  const router = useRouter();
  const rightContent =
    right ??
    (showNotificationBell ? (
      <View style={styles.bellWrap}>
        <Ionicons name="notifications-outline" size={28} color="#FFFFFF" />
        <View style={styles.notificationDot} />
      </View>
    ) : null);

  return (
    <View style={styles.shell}>
      <StatusBar style="light" backgroundColor={APP_BAR_GREEN} />
      {showBack ? (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onBack ?? (() => router.back())}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={29} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}

      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightContent ? <View style={styles.right}>{rightContent}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: APP_BAR_GREEN,
    zIndex: 5,
  },
  iconButton: {
    width: 36,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0,
    marginBottom: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25,
  },
  subtitle: {
    marginTop: 2,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 15,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bellWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    position: "absolute",
    right: 9,
    top: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
});
