import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Vibration } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const severity = notification.request.content.data?.severity;
    if (severity === 'critical' || severity === 'high') {
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    }
    return { shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true };
  },
});

export async function setupNotifications() {
  if (!Device.isDevice) {
    console.log('Notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'Emergency Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      sound: 'default',
      enableVibrate: true,
      lightColor: '#DC2626',
    });

    await Notifications.setNotificationChannelAsync('alerts-critical', {
      name: 'Critical Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
      sound: 'default',
      enableVibrate: true,
      lightColor: '#DC2626',
    });
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token:', token);
    return token;
  } catch (e) {
    console.log('Failed to get push token:', e);
    return null;
  }
}

export function onNotificationReceived(callback) {
  return Notifications.addNotificationReceivedListener(callback);
}

export function onNotificationTapped(callback) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
