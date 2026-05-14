import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { updateFcmToken } from './authApi';

let lastSyncedFcmKey: string | null = null;
let pendingFcmSyncKey: string | null = null;
let pendingFcmSyncPromise: Promise<string> | null = null;

export type NativeFcmTokenResult =
  | { ok: true; token: string }
  | { ok: false; reason: string };

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

function getFcmErrorReason(error: unknown) {
  const message =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : 'Failed to get native FCM push token.';

  if (
    message.toLowerCase().includes('firebase') ||
    message.toLowerCase().includes('google-services')
  ) {
    return `${message} Firebase Android config/google-services.json check karo.`;
  }

  return message;
}

export async function getNativeFcmTokenResultAsync(): Promise<NativeFcmTokenResult> {
  await ensureAndroidNotificationChannel();

  if (!Device.isDevice) {
    const reason = 'Must use physical device for push notifications.';
    console.log(reason);
    return { ok: false, reason };
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    const reason = 'Push notification permission was not granted.';
    console.log(reason);
    return { ok: false, reason };
  }

  try {
    const token = await Notifications.getDevicePushTokenAsync();

    if (token.type !== 'android' || typeof token.data !== 'string') {
      const reason = `Unsupported token type for fcmToken sync: ${token.type}`;
      console.warn(reason);
      return { ok: false, reason };
    }

    console.log('FCM token:', token.data);
    return { ok: true, token: token.data };
  } catch (error) {
    const reason = getFcmErrorReason(error);
    console.error('Failed to get native FCM push token:', error);
    return { ok: false, reason };
  }
}

export async function getNativeFcmTokenAsync() {
  const result = await getNativeFcmTokenResultAsync();
  return result.ok ? result.token : undefined;
}

export async function syncKnownFcmTokenWithServer(accessToken: string, fcmToken: string) {
  const syncKey = `${accessToken}:${fcmToken}`;
  if (lastSyncedFcmKey === syncKey) {
    return fcmToken;
  }

  if (pendingFcmSyncKey === syncKey && pendingFcmSyncPromise) {
    return pendingFcmSyncPromise;
  }

  pendingFcmSyncKey = syncKey;
  pendingFcmSyncPromise = updateFcmToken(accessToken, { fcmToken })
    .then(() => {
      lastSyncedFcmKey = syncKey;
      console.log('FCM token synced with server:', fcmToken);
      return fcmToken;
    })
    .finally(() => {
      pendingFcmSyncKey = null;
      pendingFcmSyncPromise = null;
    });

  return pendingFcmSyncPromise;
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
  pendingFcmSyncKey = null;
  pendingFcmSyncPromise = null;
}
