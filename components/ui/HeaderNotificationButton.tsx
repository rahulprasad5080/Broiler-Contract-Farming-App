import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";

import { Colors } from "@/constants/Colors";

type HeaderNotificationButtonProps = {
  unread?: boolean;
};

export function HeaderNotificationButton({
  unread = true,
}: HeaderNotificationButtonProps) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => Alert.alert("Notifications", "No new notifications.")}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
    >
      <Ionicons name="notifications-outline" size={22} color={Colors.text} />
      {unread ? <View style={styles.badge} /> : null}
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
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.tertiary,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
});
