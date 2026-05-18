import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
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
  const [mounted, setMounted] = useState(visible);
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

  const close = useCallback(() => {
    if (closingRef.current) return;

    closingRef.current = true;
    animateTo(hiddenOffset, () => {
      closingRef.current = false;
      setMounted(false);
      onClose();
    });
  }, [animateTo, hiddenOffset, onClose]);

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

    if (mounted && !closingRef.current) {
      closingRef.current = true;
      animateTo(hiddenOffset, () => {
        closingRef.current = false;
        setMounted(false);
      });
    }
  }, [animateTo, hiddenOffset, mounted, translateY, visible]);

  const panResponder = useMemo(
    () =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 6,
      onPanResponderMove: (_, gestureState) => {
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
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight,
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
    boxShadow: '0 -8px 30px rgba(15, 23, 42, 0.16)',
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
  },
});
