import React, { useEffect, useRef } from 'react';
import { StyleSheet, StyleProp, ViewStyle, View, TouchableOpacity, Modal, Animated, Dimensions } from 'react-native';
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
  maxHeight = '65%',
  contentStyle,
  sheetStyle,
}: NativeBottomSheetProps) {
  const screenHeight = Dimensions.get('window').height;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim, screenHeight]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.sheetContainer,
          {
            height: maxHeight,
            transform: [{ translateY: slideAnim }],
          },
          sheetStyle,
        ]}
      >
        <View style={[styles.contentContainer, contentStyle]}>
          {children}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 24,
    zIndex: 9999,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
});
