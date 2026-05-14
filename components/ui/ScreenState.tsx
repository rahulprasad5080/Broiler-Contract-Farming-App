import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Colors } from "@/constants/Colors";
import { Layout } from "@/constants/Layout";

type ScreenStateTone = "default" | "error";

type ScreenStateProps = {
  title: string;
  message?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  loading?: boolean;
  tone?: ScreenStateTone;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ScreenState({
  title,
  message,
  icon,
  loading = false,
  tone = "default",
  actionLabel,
  onAction,
  compact = false,
  style,
}: ScreenStateProps) {
  const isError = tone === "error";
  const color = isError ? Colors.error : Colors.primary;
  const backgroundColor = isError ? "#FFF4F4" : "#F6FBF7";
  const borderColor = isError ? "#F3C8C6" : "#CBE6D5";

  return (
    <View
      style={[
        styles.container,
        compact && styles.compact,
        { backgroundColor, borderColor },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : icon ? (
        <View style={[styles.iconWrap, { backgroundColor: isError ? "#FCE7E7" : "#E8F5E9" }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
      ) : null}

      <View style={styles.copy}>
        <Text style={[styles.title, { color }]}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>

      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.action} onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: Layout.borderRadius.sm,
    padding: 14,
  },
  compact: {
    minHeight: 56,
    paddingVertical: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: Layout.borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: "900",
  },
  message: {
    marginTop: 3,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  action: {
    minHeight: 34,
    borderRadius: Layout.borderRadius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  actionText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
});
