import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { userService } from '../services/api';

/** Request notification permissions and register Expo push token with backend when user is logged in. */
export async function registerPushTokenWhenLoggedIn(): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    // Push was removed from Expo Go in SDK 53+. Don't load expo-notifications at all in Expo Go to avoid the error/warn.
    if (Constants.appOwnership === 'expo') return;

    const Notifications = await import('expo-notifications');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // uses app.json slug/project when in managed workflow
    });
    const token = tokenData?.data;
    if (token && typeof token === 'string') {
      await userService.registerPushToken(token);
    }
  } catch (e) {
    // Simulator/emulator or no projectId – push won't work; ignore
  }
}
