import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import Toast from 'react-native-toast-message';

import { useAuth } from '@/context/AuthContext';
import {
  syncFcmTokenWithServer,
  syncKnownFcmTokenWithServer,
} from '@/services/pushNotifications';

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

export const usePushNotifications = (): PushNotificationState => {
  const { accessToken, user } = useAuth();
  const [fcmToken, setFcmToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const pushTokenListener = useRef<Notifications.EventSubscription | null>(null);
  const canRegisterPushToken = Boolean(accessToken && user?.id);

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
        if (accessToken) {
          syncKnownFcmTokenWithServer(accessToken, token.data).catch((error) => {
            console.warn('Failed to sync refreshed FCM token with server:', error);
          });
        }
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      pushTokenListener.current?.remove();
    };
  }, [accessToken]);

  useEffect(() => {
    if (!canRegisterPushToken) {
      return;
    }

    let cancelled = false;

    syncFcmTokenWithServer(accessToken!).then((token) => {
      if (!cancelled && token) {
        setFcmToken(token);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [accessToken, canRegisterPushToken]);

  return {
    fcmToken,
    notification,
  };
};
