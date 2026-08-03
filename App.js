import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation';
import { registerForPushNotifications } from './src/services/notifications';

export default function App() {
  // useEffect(() => {
  //   registerForPushNotifications();
  // }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </AuthProvider>
  );
}