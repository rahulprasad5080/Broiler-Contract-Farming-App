import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { useAuth } from '@/context/AuthContext';
import { authenticateWithBiometrics, getBiometricAvailability } from '@/services/authSecurity';

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const { setBiometricPreference, user } = useAuth();
  const [biometricEnabled, setBiometricEnabled] = React.useState(user?.biometricEnabled ?? false);
  const [biometricAvailable, setBiometricAvailable] = React.useState(true);
  const [isTogglingBiometric, setIsTogglingBiometric] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    const checkBiometric = async () => {
      const availability = await getBiometricAvailability();
      if (mounted) {
        setBiometricAvailable(availability.available);
      }
    };

    void checkBiometric();

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    setBiometricEnabled(user?.biometricEnabled ?? false);
  }, [user?.biometricEnabled]);

  const handleBiometricToggle = async () => {
    if (isTogglingBiometric) return;
    setIsTogglingBiometric(true);

    try {
      if (!biometricEnabled) {
        const result = await authenticateWithBiometrics('Enable biometric unlock');

        if (!result.success) {
          if (result.error) {
            Toast.show({
              type: 'error',
              text1: 'Biometric setup',
              text2: result.error,
              position: 'bottom',
            });
          }
          return;
        }

        await setBiometricPreference(true);
        setBiometricEnabled(true);
        Toast.show({
          type: 'success',
          text1: 'Biometric enabled',
          text2: 'Fingerprint or face unlock is now ready.',
          position: 'bottom',
        });
        return;
      }

      await setBiometricPreference(false);
      setBiometricEnabled(false);
      Toast.show({
        type: 'success',
        text1: 'Biometric disabled',
        text2: 'You can still use password or PIN to unlock.',
        position: 'bottom',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Security update failed',
        text2: error instanceof Error ? error.message : 'Please try again.',
        position: 'bottom',
      });
    } finally {
      setIsTogglingBiometric(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Security"
        subtitle="Password, PIN and biometric unlock"
        leadingMode="back"
        onBack={() => router.back()}
      />

      <View style={styles.content}>
        <SurfaceCard padded={false} style={styles.settingsGroup}>
          <SecurityItem
            icon="lock-closed-outline"
            title="Change Password"
            subtitle="Update login password"
            onPress={() => router.navigate('/(auth)/change-password' as any)}
          />
          <SecurityItem
            icon="key-outline"
            title="Change PIN"
            subtitle="Change quick unlock PIN"
            onPress={() => router.navigate('/(auth)/set-pin' as any)}
          />
          {biometricAvailable ? (
            <View style={[styles.securityItem, styles.securityItemLast]}>
              <View style={styles.securityItemLeft}>
                <View style={styles.iconBox}>
                  <Ionicons name="finger-print" size={20} color="#4B5563" />
                </View>
                <View style={styles.securityCopy}>
                  <Text style={styles.securityTitle}>Biometric</Text>
                  <Text style={styles.securitySubtitle}>Fingerprint or face unlock</Text>
                </View>
              </View>
              <View style={styles.toggleContainer}>
                {isTogglingBiometric ? <ActivityIndicator size="small" color="#0B5C36" style={{ marginRight: 8 }} /> : null}
                <TouchableOpacity
                  style={[
                    styles.biometricSwitch,
                    biometricEnabled && styles.biometricSwitchOn,
                    isTogglingBiometric && styles.biometricSwitchDisabled,
                  ]}
                  onPress={handleBiometricToggle}
                  disabled={isTogglingBiometric}
                  activeOpacity={0.82}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: biometricEnabled, disabled: isTogglingBiometric }}
                >
                  <View style={[styles.biometricSwitchThumb, biometricEnabled && styles.biometricSwitchThumbOn]}>
                    <Ionicons
                      name={biometricEnabled ? 'checkmark' : 'close'}
                      size={13}
                      color={biometricEnabled ? '#0B5C36' : '#94A3B8'}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </SurfaceCard>
      </View>
    </View>
  );
}

function SecurityItem({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.securityItem} onPress={onPress} activeOpacity={0.72}>
      <View style={styles.securityItemLeft}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={20} color="#4B5563" />
        </View>
        <View style={styles.securityCopy}>
          <Text style={styles.securityTitle}>{title}</Text>
          <Text style={styles.securitySubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  settingsGroup: {
    overflow: 'hidden',
  },
  securityItem: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  securityItemLast: {
    borderBottomWidth: 0,
  },
  securityItemLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 32,
    alignItems: 'center',
  },
  securityCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 4,
  },
  securityTitle: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  securitySubtitle: {
    marginTop: 3,
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  toggleContainer: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 58,
    justifyContent: 'flex-end',
    marginLeft: 12,
  },
  biometricSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    padding: 3,
    justifyContent: 'center',
  },
  biometricSwitchOn: {
    backgroundColor: '#BBF7D0',
  },
  biometricSwitchDisabled: {
    opacity: 0.65,
  },
  biometricSwitchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  biometricSwitchThumbOn: {
    alignSelf: 'flex-end',
  },
});
