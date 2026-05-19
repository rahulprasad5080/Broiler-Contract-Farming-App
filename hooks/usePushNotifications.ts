import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useRootNavigationState, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { useAuth } from '@/context/AuthContext';
import { resolveNotificationRoute } from '@/services/notificationRouting';
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
  const { accessToken, isAppUnlocked, isReady, user } = useAuth();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [fcmToken, setFcmToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const [pendingResponse, setPendingResponse] =
    useState<Notifications.NotificationResponse | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const pushTokenListener = useRef<Notifications.EventSubscription | null>(null);
  const handledResponseIds = useRef<Set<string>>(new Set());
  const canRegisterPushToken = Boolean(accessToken && user?.id);

  const queueNotificationResponse = (response: Notifications.NotificationResponse | null) => {
    if (!response) return;

    const responseId = [
      response.notification.request.identifier,
      response.actionIdentifier,
      response.notification.date,
    ].join(':');

    if (handledResponseIds.current.has(responseId)) {
      return;
    }

    setPendingResponse(response);
  };

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
      queueNotificationResponse(response);
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
    let cancelled = false;

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!cancelled) {
          queueNotificationResponse(response);
        }
      })
      .catch((error) => {
        console.warn('Failed to read initial notification response:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!pendingResponse || !rootNavigationState?.key || !isReady || !isAppUnlocked || !user?.role) {
      return;
    }

    const responseId = [
      pendingResponse.notification.request.identifier,
      pendingResponse.actionIdentifier,
      pendingResponse.notification.date,
    ].join(':');

    if (handledResponseIds.current.has(responseId)) {
      setPendingResponse(null);
      return;
    }

    handledResponseIds.current.add(responseId);
    setPendingResponse(null);

    const data = pendingResponse.notification.request.content.data ?? {};
    const { href, usedFallback } = resolveNotificationRoute({
      role: user.role,
      data,
    });

    if (usedFallback) {
      Toast.show({
        type: 'info',
        text1: 'Opening notifications',
        text2: 'Notification details were incomplete.',
        position: 'top',
        visibilityTime: 2500,
        autoHide: true,
        topOffset: 50,
      });
    }

    const timer = setTimeout(() => {
      try {
        router.navigate(href as never);
      } catch (error) {
        console.warn('Failed to navigate from notification tap:', error);
        router.navigate(resolveNotificationRoute({ role: user.role, data: null }).href as never);
      } finally {
        Notifications.clearLastNotificationResponseAsync().catch(() => {});
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [isAppUnlocked, isReady, pendingResponse, rootNavigationState?.key, router, user?.role]);

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
