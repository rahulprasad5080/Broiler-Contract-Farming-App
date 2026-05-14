import { useState, useEffect, useRef } from 'react';
import Toast from 'react-native-toast-message';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export interface PushNotificationState {
  expoPushToken?: Notifications.ExpoPushToken;
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
  const [expoPushToken, setExpoPushToken] = useState<Notifications.ExpoPushToken | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0B5C36',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        
      if (!projectId) {
        console.error('❌ TEST FAILED: "projectId" missing. Aapko terminal mein `npx eas init` run karna hoga apna project ID generate karne ke liye.');
        return;
      }
        
      try {
        console.log('--- TEST: Fetching Expo Push Token ---');
        token = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        console.log('✅ TEST SUCCESS! Expo Push Token: ', token.data);
      } catch (e) {
        console.error('❌ TEST FAILED: Error getting push token', e);
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  }

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) setExpoPushToken(token);
    });

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
      
      // Beautiful In-App Notification UI when app is open
      const title = notification.request.content.title;
      const body = notification.request.content.body;
      
      if (title || body) {
        Toast.show({
          type: 'success', // Or 'info' based on your toast config
          text1: title || 'New Notification',
          text2: body || '',
          position: 'top',
          visibilityTime: 4000,
          autoHide: true,
          topOffset: 50,
          props: {
            // Can pass custom props if you have a custom toast component
            icon: 'bell-outline' 
          }
        });
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification Response:', response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    expoPushToken,
    notification,
  };
};
