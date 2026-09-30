import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import {syncReminderNotifications} from './src/services/notifications';
import {syncNaamsOnLaunch} from './src/services/api';

function App() {
  useEffect(() => {
    syncReminderNotifications().catch(() => {});
    // Pull the admin panel's naams as early as possible so the counter screen
    // has one to show on a fresh install.
    syncNaamsOnLaunch();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
