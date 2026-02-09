import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
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
  return (
    <AuthProvider>
      <PushTokenRegistration />
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
    </AuthProvider>
  );
}
