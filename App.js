import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation';
import { registerForPushNotifications } from './src/services/notifications';

// import * as NavigationBar from 'expo-navigation-bar';
// import { COLORS } from './src/constants/theme';

export default function App() {
  // useEffect(() => {
  //   NavigationBar.setBackgroundColorAsync(COLORS.background);
  //   NavigationBar.setButtonStyleAsync('light'); // white icons for dark bg
  // }, []);

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