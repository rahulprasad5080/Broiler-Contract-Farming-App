import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
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
  const hiddenOffset = Math.max(height, 1);
  const translateY = useRef(new Animated.Value(hiddenOffset)).current;

  // FIX 1: Keep onClose in a ref so `close` never needs it as a useCallback
  // dependency. Previously, every inline `() => setVisible(false)` passed as
  // onClose created a new function identity on every parent render, which forced
  // `close` to be recreated, which in turn forced `panResponder` to be torn
  // down and rebuilt — causing the gesture glitch and double-fire.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const resolvedMaxHeight = useMemo(() => {
    if (!maxHeight) return height * 0.82;
    if (typeof maxHeight === 'number') return maxHeight;
    if (maxHeight.endsWith('%')) {
      const pct = parseFloat(maxHeight) / 100;
      return height * pct;
    }
    return height * 0.82;
  }, [maxHeight, height]);

  const [mounted, setMounted] = useState(visible);

  // FIX 2: Mirror `mounted` in a ref so the close path inside useEffect can
  // read it without adding `mounted` to the dependency array. Previously,
  // `mounted` in deps caused: setMounted(false) → effect re-runs → animation
  // fires again → sheet flashes/repeats.
  const mountedRef = useRef(mounted);
  useEffect(() => {
    mountedRef.current = mounted;
  }, [mounted]);

  const closingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  const animateTo = useCallback(
    (toValue: number, after?: () => void) => {
      Animated.timing(translateY, {
        toValue,
        duration: toValue === 0 ? 260 : 220,
        easing: toValue === 0 ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) after?.();
      });
    },
    [translateY],
  );

  // Stable close — only depends on animateTo and hiddenOffset (both stable).
  // onClose is read from a ref at call time, not captured in the dep array.
  const close = useCallback(() => {
    if (closingRef.current) return;

    Keyboard.dismiss();
    closingRef.current = true;
    animateTo(hiddenOffset, () => {
      closingRef.current = false;
      setMounted(false);
      onCloseRef.current();
    });
  }, [animateTo, hiddenOffset]);

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      setMounted(true);
      translateY.setValue(hiddenOffset);
      animationFrameRef.current = requestAnimationFrame(() => animateTo(0));
      return () => {
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    }

    // Read mountedRef (not mounted state) to avoid adding `mounted` to deps.
    if (mountedRef.current && !closingRef.current) {
      closingRef.current = true;
      animateTo(hiddenOffset, () => {
        closingRef.current = false;
        setMounted(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]); // intentionally only [visible] — animateTo/hiddenOffset are stable

  // FIX 3: Because `close` is now stable (no changing deps), `panResponder`
  // is created once and never torn down mid-gesture.
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

        animateTo(0);
      },
      onPanResponderTerminate: () => animateTo(0),
    }),
    [animateTo, close, translateY],
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.root}
      >
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
      </KeyboardAvoidingView>
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
