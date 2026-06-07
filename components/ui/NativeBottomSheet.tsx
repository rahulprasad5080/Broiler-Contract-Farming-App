import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';

type NativeBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: number | `${number}%`;
  contentStyle?: StyleProp<ViewStyle>;
  sheetStyle?: StyleProp<ViewStyle>;
};

export function NativeBottomSheet({
  visible,
  onClose,
  children,
  maxHeight = '82%',
  contentStyle,
  sheetStyle,
}: NativeBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Capture the initial screen height once — we must NOT let keyboard-triggered
  // height changes re-fire the open/close animation effect (that causes the
  // open→close→open glitch loop on Android when a TextInput inside the sheet
  // gets focused).
  const hiddenOffsetRef = useRef(Math.max(height, 1));
  const hiddenOffset = hiddenOffsetRef.current;
  // resolvedMaxHeight must also use the stable ref height — NOT the live
  // useWindowDimensions() height — so the sheet size doesn't jump when the
  // Android keyboard changes the reported window height.
  const resolvedMaxHeight = useMemo(() => {
    const stableHeight = hiddenOffsetRef.current;
    if (!maxHeight) return stableHeight * 0.82;
    if (typeof maxHeight === 'number') return maxHeight;
    if (maxHeight.endsWith('%')) {
      const pct = parseFloat(maxHeight) / 100;
      return stableHeight * pct;
    }
    return stableHeight * 0.82;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxHeight]);
  const translateY = useRef(new Animated.Value(hiddenOffset)).current;
  const [mounted, setMounted] = useState(visible);

  // Handle animation driven by the `visible` prop.
  // Intentionally NOT including hiddenOffset in deps — it is captured once via
  // ref so keyboard resizes don't accidentally re-trigger this effect.
  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(hiddenOffset);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(translateY, {
        toValue: hiddenOffset,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setMounted(false);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const close = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 6,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 10) {
            Keyboard.dismiss();
          }
          translateY.setValue(Math.max(gestureState.dy, 0));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 96 || gestureState.vy > 0.85) {
            close();
            return;
          }
          Animated.timing(translateY, {
            toValue: 0,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.timing(translateY, {
            toValue: 0,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        },
      }),
    [close, translateY],
  );

  if (!mounted) return null;

  const backdropOpacity = translateY.interpolate({
    inputRange: [0, hiddenOffset],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
    >
      {/* Plain View — no KeyboardAvoidingView.
          KeyboardAvoidingView inside a Modal causes the modal's reported
          window height to change when the keyboard opens, which re-fires
          the animation useEffect and produces the open→close→open glitch.
          On Android the OS handles keyboard avoidance via windowSoftInputMode;
          on iOS the sheet sits above the keyboard naturally via insets. */}
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: resolvedMaxHeight,
              paddingBottom: Math.max(insets.bottom, 12),
              transform: [{ translateY }],
            },
            sheetStyle,
          ]}
        >
          <View style={styles.dragArea} {...panResponder.panHandlers}>
            <View style={styles.grabber} />
          </View>
          <View style={[styles.content, contentStyle]}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  sheet: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    // Cross-platform shadow (boxShadow is web-only and silently no-ops on iOS/Android)
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.16,
        shadowRadius: 30,
      },
      android: {
        elevation: 16,
      },
    }),
    flexShrink: 1,
  },
  dragArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
  },
  content: {
    paddingHorizontal: 18,
    flexShrink: 1,
  },
});
