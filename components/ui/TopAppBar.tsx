/**
 * TopAppBar — Global reusable header component
 *
 * Supports two leading modes:
 *   - "menu"  → hamburger icon that opens the global DashboardSidebar (via SidebarContext)
 *   - "back"  → arrow-back icon that pops the navigation stack (or calls onBack)
 *
 * The Admin Dashboard header design (green bg, logo text, icon buttons) is the
 * canonical template. All screens use this component instead of ad-hoc headers.
 */
import { Feather, Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSidebar } from '@/context/SidebarContext';

export type TopAppBarProps = {
  /**
   * "menu"  → show hamburger; opens global sidebar (default for dashboards)
   * "back"  → show back arrow; pops the stack (default for sub-screens)
   * "none"  → hide the leading button completely (useful for forced flows)
   */
  leadingMode?: 'menu' | 'back' | 'none';

  /** Screen title shown in the centre of the bar */
  title: string;

  /** Optional smaller subtitle beneath the title */
  subtitle?: string;

  /** Optional tiny eyebrow text above the title */
  eyebrow?: string;

  /**
   * Notification bell badge count.
   * Pass 0 or undefined to hide the badge.
   * Pass -1 to hide the bell entirely.
   */
  notificationCount?: number;

  /** Called when the notification bell is pressed */
  onNotificationPress?: () => void;

  /** Custom back handler (only used when leadingMode = "back") */
  onBack?: () => void;

  /**
   * Arbitrary right-side content that replaces the default bell button.
   * If provided, notificationCount / onNotificationPress are ignored.
   */
  right?: React.ReactNode;
};

const THEME_GREEN = '#0B5C36';

export function TopAppBar({
  leadingMode = 'back',
  title,
  subtitle,
  eyebrow,
  notificationCount,
  onNotificationPress,
  onBack,
  right,
}: TopAppBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sidebar = useSidebar();

  // ── Leading icon ──────────────────────────────────────────────────────────
  let leadingButton: React.ReactNode;
  if (leadingMode === 'menu') {
    leadingButton = (
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={sidebar.openSidebar}
        accessibilityRole="button"
        accessibilityLabel="Open navigation menu"
      >
        <Ionicons name="menu" size={22} color="#FFF" />
      </TouchableOpacity>
    );
  } else if (leadingMode === 'back') {
    leadingButton = (
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onBack ?? (() => router.back())}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={22} color="#FFF" />
      </TouchableOpacity>
    );
  } else {
    // "none" -> invisible placeholder
    leadingButton = <View style={styles.iconBtn} />;
  }

  // ── Trailing / right area ─────────────────────────────────────────────────
  let trailingContent: React.ReactNode;
  if (right !== undefined) {
    trailingContent = <View style={styles.right}>{right}</View>;
  } else if (notificationCount !== -1 && onNotificationPress) {
    const badgeCount = notificationCount ?? 0;
    trailingContent = (
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onNotificationPress}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
      >
        <Feather name="bell" size={22} color="#FFF" />
        {badgeCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badgeCount > 9 ? '9+' : badgeCount}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  } else {
    // Invisible placeholder to keep the title centred
    trailingContent = <View style={styles.iconBtn} />;
  }

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
      <StatusBar style="light" backgroundColor={THEME_GREEN} />

      {/* Leading (hamburger or back) */}
      {leadingButton}

      {/* Centre copy */}
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title} numberOfLines={1}>
          Poultry<Text style={styles.titleLight}>Flow</Text>
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Trailing */}
      {trailingContent}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: THEME_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    position: 'relative',
  },
  copy: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    paddingHorizontal: 8,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  titleLight: {
    fontWeight: '400',
    opacity: 0.8,
  },
  subtitle: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    fontWeight: '700',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#D32F2F',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME_GREEN,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
