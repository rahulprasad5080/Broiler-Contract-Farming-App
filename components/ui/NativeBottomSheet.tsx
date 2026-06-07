import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
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
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    []
  );

  const snapPoints = useMemo(() => {
    return [maxHeight];
  }, [maxHeight]);

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.grabber}
      style={sheetStyle}
      enableDynamicSizing={false}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetView style={[styles.contentContainer, contentStyle]}>
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  grabber: {
    backgroundColor: '#D1D5DB',
    width: 40,
    height: 5,
    borderRadius: 999,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
});
