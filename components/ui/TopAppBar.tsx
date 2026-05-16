/**
 * TopAppBar — Global reusable header component
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

  const menuButton = (
    <TouchableOpacity
      key="menu-btn"
      style={styles.iconBtn}
      onPress={sidebar.openSidebar}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Open navigation menu"
    >
      <Ionicons name="menu" size={24} color="#FFF" />
    </TouchableOpacity>
  );

  const backButton = (
    <TouchableOpacity
      key="back-btn"
      style={styles.iconBtn}
      onPress={onBack ?? (() => router.back())}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons name="arrow-back" size={22} color="#FFF" />
    </TouchableOpacity>
  );

  // ── Leading area ──────────────────────────────────────────────────────────
  let leadingContent: React.ReactNode;
  if (leadingMode === 'menu' || leadingMode === 'back') {
    leadingContent = menuButton;
  } else {
    leadingContent = <View style={styles.iconBtnPlaceholder} />;
  }

  // ── Trailing / right area ─────────────────────────────────────────────────
  const trailingItems: React.ReactNode[] = [];

  if (right !== undefined) {
    trailingItems.push(<React.Fragment key="custom-right">{right}</React.Fragment>);
  }

  // Notification bell (Only on dashboard screens where leadingMode='menu')
  if (leadingMode === 'menu' && notificationCount !== -1) {
    const badgeCount = notificationCount ?? 0;
    trailingItems.push(
      <TouchableOpacity
        key="bell-btn"
        style={styles.iconBtn}
        onPress={onNotificationPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
      >
        <Feather name="bell" size={20} color="#FFF" />
        {badgeCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badgeCount > 9 ? '9+' : badgeCount}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  }

  // The menu icon is now handled on the left side for "back" mode.
  // No longer adding it to the trailing items here.

  const trailingContent = trailingItems.length > 0 ? (
    <View style={styles.right}>{trailingItems}</View>
  ) : (
    <View style={styles.iconBtnPlaceholder} />
  );

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <StatusBar style="light" backgroundColor={THEME_GREEN} translucent />

      {/* Side Content — Positioned to allow title centering */}
      <View style={styles.sideWrapper}>
        {leadingContent}
      </View>

      {/* Centre Copy */}
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow} numberOfLines={1}>{eyebrow}</Text> : null}
        <Text style={styles.title} numberOfLines={1}>
          Poultry<Text style={styles.titleLight}>Flow</Text>
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={[styles.sideWrapper, styles.sideRight]}>
        {trailingContent}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: THEME_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sideWrapper: {
    minWidth: 40,
    zIndex: 10,
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    position: 'relative',
  },
  iconBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  copy: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    pointerEvents: 'none', // Allow taps on side buttons
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 0,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  titleLight: {
    fontWeight: '300',
    opacity: 0.9,
  },
  subtitle: {
    marginTop: 1,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FF3B30',
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME_GREEN,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '800',
  },
});
