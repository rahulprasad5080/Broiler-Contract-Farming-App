import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { Colors } from "@/constants/Colors";
import { Layout } from "@/constants/Layout";

type SurfaceCardProps = ViewProps & {
  padded?: boolean;
};

export function SurfaceCard({ padded = true, style, ...props }: SurfaceCardProps) {
  return <View {...props} style={[styles.card, padded && styles.padded, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  padded: {
    padding: 16,
  },
});
