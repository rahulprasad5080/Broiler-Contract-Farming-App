import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { updateFcmToken } from './authApi';

let lastSyncedFcmKey: string | null = null;

export async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0B5C36',
  });
}

export async function getNativeFcmTokenAsync() {
  await ensureAndroidNotificationChannel();

  if (!Device.isDevice) {
    console.log('Must use physical device for push notifications.');
    return undefined;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission was not granted.');
    return undefined;
  }

  try {
    const token = await Notifications.getDevicePushTokenAsync();

    if (token.type !== 'android' || typeof token.data !== 'string') {
      console.warn(`Unsupported token type for fcmToken sync: ${token.type}`);
      return undefined;
    }

    return token.data;
  } catch (error) {
    console.error('Failed to get native FCM push token:', error);
    return undefined;
  }
}

export async function syncKnownFcmTokenWithServer(accessToken: string, fcmToken: string) {
  const syncKey = `${accessToken}:${fcmToken}`;
  if (lastSyncedFcmKey === syncKey) {
    return fcmToken;
  }

  await updateFcmToken(accessToken, { fcmToken });
  lastSyncedFcmKey = syncKey;
  return fcmToken;
}

export async function syncFcmTokenWithServer(accessToken: string) {
  const fcmToken = await getNativeFcmTokenAsync();

  if (!fcmToken) {
    return undefined;
  }

  return syncKnownFcmTokenWithServer(accessToken, fcmToken);
}

export function clearSyncedFcmTokenCache() {
  lastSyncedFcmKey = null;
}
