import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";

type HeaderNotificationButtonProps = {
  unread?: boolean;
  unreadCount?: number;
};

export function HeaderNotificationButton({
  unread = true,
  unreadCount = 4,
}: HeaderNotificationButtonProps) {
  const router = useRouter();
  const { hasPermission, user } = useAuth();

  if (!hasPermission("view:notifications")) {
    return null;
  }

  const route: Href =
    user?.role === "OWNER"
      ? "/(owner)/notifications"
      : user?.role === "SUPERVISOR"
        ? "/(supervisor)/notifications"
        : "/(farmer)/notifications";

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => router.push(route)}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
    >
      <Ionicons name="notifications-outline" size={22} color={Colors.text} />
      {unread ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6FBF7",
    borderWidth: 1,
    borderColor: "#DDEBE3",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.tertiary,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 11,
  },
});
