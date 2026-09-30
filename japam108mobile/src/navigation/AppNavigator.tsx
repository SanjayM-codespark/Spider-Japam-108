import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {RootStackParamList} from './types';
import {
  SplashScreen,
  WelcomeScreen,
  NaamPreferencesScreen,
  CategoryScreen,
  ContentScreen,
  SavedScreen,
  AboutScreen,
  HelpScreen,
} from '../screens';
import {getSetting, setSetting} from '../database/database';
import BottomTabNavigator from './BottomTabNavigator';
import {SettingsProvider} from '../context/SettingsContext';
import {ThemeProvider} from '../context/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

const ONBOARDED_KEY = 'is_onboarded';

function SplashWrapper({navigation}: any) {
  const onFinish = async () => {
    const onboarded = await getSetting(ONBOARDED_KEY);
    navigation.replace(onboarded === '1' ? 'Home' : 'Welcome');
  };
  return <SplashScreen onFinish={onFinish} />;
}

function WelcomeWrapper({navigation}: any) {
  const onGetStarted = async () => {
    await setSetting(ONBOARDED_KEY, '1');
    navigation.replace('Home');
  };
  return <WelcomeScreen onGetStarted={onGetStarted} />;
}

const AppNavigator: React.FC = () => {
  return (
    <SettingsProvider>
      <ThemeProvider>
      <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}>
        <Stack.Screen name="Splash" component={SplashWrapper} />
        <Stack.Screen name="Welcome" component={WelcomeWrapper} />
        <Stack.Screen
          name="Home"
          component={BottomTabNavigator}
          options={{animation: 'slide_from_right'}}
        />
        <Stack.Screen
          name="NaamPreferences"
          component={NaamPreferencesScreen}
          options={{animation: 'slide_from_right'}}
        />
        <Stack.Screen
          name="Category"
          component={CategoryScreen}
          options={{animation: 'slide_from_right'}}
        />
        <Stack.Screen
          name="Content"
          component={ContentScreen}
          options={{animation: 'slide_from_right'}}
        />
        <Stack.Screen
          name="Saved"
          component={SavedScreen}
          options={{animation: 'slide_from_right'}}
        />
        {/* Settings > About & Legal */}
        <Stack.Screen
          name="About"
          component={AboutScreen}
          options={{animation: 'slide_from_right'}}
        />
        <Stack.Screen
          name="Help"
          component={HelpScreen}
          options={{animation: 'slide_from_right'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
      </ThemeProvider>
    </SettingsProvider>
  );
};

export default AppNavigator;
