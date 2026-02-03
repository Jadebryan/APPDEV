import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { StoriesProvider } from './src/context/StoriesContext';
import { NotificationsProvider } from './src/context/NotificationsContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <StoriesProvider>
        <NotificationsProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </NotificationsProvider>
      </StoriesProvider>
    </AuthProvider>
  );
}
