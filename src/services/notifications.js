import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { authAPI } from './api';
import { COLORS } from '../constants/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log('Running on emulator/simulator — push notifications may not work without Google Play services, attempting anyway');
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: COLORS.accent,
    });
  }

  try {
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data;

    // Token backend ko bhejo save karne ke liye
    console.log('✅ PUSH TOKEN GENERATED:', token);

    // Token backend ko bhejo save karne ke liye
    const res = await authAPI.updateFcmToken(token);
    console.log('✅ TOKEN SENT TO BACKEND, response:', res?.data);

    return token;
  } catch (err) {
    console.log('Error getting push token:', err);
    return null;
  }
}