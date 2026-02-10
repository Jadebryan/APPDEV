import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
// Load Poppins from project assets (available as fontFamily: 'Poppins_400Regular', etc.)
const poppinsFonts = {
  Poppins_400Regular: require('./assets/fonts/Poppins_400Regular.ttf'),
  Poppins_500Medium: require('./assets/fonts/Poppins_500Medium.ttf'),
  Poppins_600SemiBold: require('./assets/fonts/Poppins_600SemiBold.ttf'),
  Poppins_700Bold: require('./assets/fonts/Poppins_700Bold.ttf'),
};
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { RealtimeProvider } from './src/context/RealtimeContext';
import { StoriesProvider } from './src/context/StoriesContext';
import { NotificationsProvider } from './src/context/NotificationsContext';
import { ToastProvider } from './src/context/ToastContext';
import { UploadProvider } from './src/context/UploadContext';
import AppNavigator from './src/navigation/AppNavigator';
import { registerPushTokenWhenLoggedIn } from './src/utils/registerPushToken';

function PushTokenRegistration() {
  const { user } = useAuth();
  useEffect(() => {
    if (user) {
      registerPushTokenWhenLoggedIn();
    }
  }, [user]);
  return null;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts(poppinsFonts);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <PushTokenRegistration />
      <RealtimeProvider>
        <StoriesProvider>
          <NotificationsProvider>
            <ToastProvider>
              <UploadProvider>
                <AppNavigator />
                <StatusBar style="auto" />
              </UploadProvider>
            </ToastProvider>
          </NotificationsProvider>
        </StoriesProvider>
      </RealtimeProvider>
    </AuthProvider>
  );
}
