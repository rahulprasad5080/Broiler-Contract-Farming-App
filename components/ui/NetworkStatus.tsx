import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useSyncStore } from '@/services/offlineSyncQueue';

export const NetworkStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [showModal, setShowModal] = useState(false);

  // Sync state subscription
  const isSyncing = useSyncStore(state => state.isSyncing);
  const syncProgress = useSyncStore(state => state.syncProgress);
  const queueCount = useSyncStore(state => state.queueCount);

  const [visibleProgress, setVisibleProgress] = useState('');
  const [showProgressBanner, setShowProgressBanner] = useState(false);

  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      if (state.isConnected === false) {
        setShowModal(true);
      } else {
        setShowModal(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync banner visibility and auto-hide
  useEffect(() => {
    if (isSyncing) {
      setVisibleProgress(syncProgress);
      setShowProgressBanner(true);
    } else if (syncProgress) {
      setVisibleProgress(syncProgress);
      setShowProgressBanner(true);
      // Auto-hide completed message after 4 seconds
      const timer = setTimeout(() => {
        setShowProgressBanner(false);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setShowProgressBanner(false);
    }
  }, [isSyncing, syncProgress]);

  // Spinning animation loop for loader icon
  useEffect(() => {
    if (isSyncing) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [isSyncing, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (isConnected === false) {
    return (
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <View style={styles.alertBox}>
            <View style={styles.iconCircle}>
              <Feather name="wifi-off" size={32} color="#DC2626" />
            </View>
            
            <Text style={styles.title}>No Internet Connection</Text>
            <Text style={styles.message}>
              Please check your internet settings and try again. Some features may not work offline.
            </Text>

            <TouchableOpacity 
              style={styles.button}
              onPress={() => {
                NetInfo.refresh().then(state => {
                  if (state.isConnected) {
                    setShowModal(false);
                  }
                });
              }}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (!showProgressBanner || !visibleProgress) return null;

  const isSuccess = visibleProgress.toLowerCase().includes('success') || visibleProgress.toLowerCase().includes('complete');
  const isError = visibleProgress.toLowerCase().includes('failed') || visibleProgress.toLowerCase().includes('error');

  return (
    <View style={styles.progressBannerContainer}>
      <View style={[
        styles.progressBanner,
        isError ? styles.progressBannerError : (isSuccess ? styles.progressBannerSuccess : styles.progressBannerSyncing)
      ]}>
        <View style={styles.progressIconWrap}>
          {isSyncing ? (
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Feather name="loader" size={18} color="#0B5C36" />
            </Animated.View>
          ) : isError ? (
            <Feather name="alert-triangle" size={18} color="#DC2626" />
          ) : (
            <Feather name="check-circle" size={18} color="#047857" />
          )}
        </View>
        <View style={styles.progressTextWrap}>
          <Text style={[
            styles.progressText,
            isError ? styles.progressTextError : (isSuccess ? styles.progressTextSuccess : styles.progressTextSyncing)
          ]}>
            {visibleProgress}
          </Text>
          {queueCount > 0 && isSyncing && (
            <Text style={styles.progressSubtext}>
              {queueCount} pending in queue
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#0B5C36',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progressBannerContainer: {
    position: 'absolute',
    bottom: 90, // Float above the bottom navigation bar
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  progressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    gap: 12,
  },
  progressBannerSyncing: {
    backgroundColor: '#E7F5ED',
    borderColor: '#A3D9C9',
  },
  progressBannerSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  progressBannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  progressIconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressTextWrap: {
    flex: 1,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressTextSyncing: {
    color: '#0B5C36',
  },
  progressTextSuccess: {
    color: '#065F46',
  },
  progressTextError: {
    color: '#991B1B',
  },
  progressSubtext: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
    marginTop: 2,
  },
});
