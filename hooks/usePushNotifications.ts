import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Toast from 'react-native-toast-message';

import { useAuth } from '@/context/AuthContext';
import { updateFcmToken } from '@/services/authApi';

export interface PushNotificationState {
  fcmToken?: string;
  notification?: Notifications.Notification;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidNotificationChannel() {
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

export const usePushNotifications = (): PushNotificationState => {
  const { accessToken, user } = useAuth();
  const [fcmToken, setFcmToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const pushTokenListener = useRef<Notifications.EventSubscription | null>(null);
  const syncedTokenRef = useRef<string | null>(null);
  const canRegisterPushToken = Boolean(accessToken && user?.id);

  async function registerForPushNotificationsAsync() {
    if (!canRegisterPushToken) {
      return undefined;
    }

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

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);

      const title = notification.request.content.title;
      const body = notification.request.content.body;

      if (title || body) {
        Toast.show({
          type: 'success',
          text1: title || 'New Notification',
          text2: body || '',
          position: 'top',
          visibilityTime: 4000,
          autoHide: true,
          topOffset: 50,
          props: {
            icon: 'bell-outline',
          },
        });
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response:', response);
    });

    pushTokenListener.current = Notifications.addPushTokenListener((token) => {
      if (token.type === 'android' && typeof token.data === 'string') {
        setFcmToken(token.data);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      pushTokenListener.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!canRegisterPushToken) {
      return;
    }

    let cancelled = false;

    registerForPushNotificationsAsync().then((token) => {
      if (!cancelled && token) {
        setFcmToken(token);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [canRegisterPushToken]);

  useEffect(() => {
    if (!accessToken || !user?.id || !fcmToken) {
      return;
    }

    const syncKey = `${user.id}:${fcmToken}`;
    if (syncedTokenRef.current === syncKey) {
      return;
    }

    let cancelled = false;

    updateFcmToken(accessToken, { fcmToken })
      .then(() => {
        if (!cancelled) {
          syncedTokenRef.current = syncKey;
        }
      })
      .catch((error) => {
        console.warn('Failed to sync FCM token with server:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, fcmToken, user?.id]);

  return {
    fcmToken,
    notification,
  };
};
