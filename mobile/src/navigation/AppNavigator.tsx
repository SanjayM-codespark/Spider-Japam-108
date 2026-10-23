import React, {useEffect, useRef} from 'react';
import {StatusBar} from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {RootStackParamList} from './types';
import {
  SplashScreen,
  WelcomeScreen,
  LoginScreen,
  RegisterScreen,
  ForgotPasswordScreen,
  NaamPreferencesScreen,
  CategoryScreen,
  SubcategoryScreen,
  ContentScreen,
  SavedScreen,
  AboutScreen,
  HelpScreen,
} from '../screens';
import BottomTabNavigator from './BottomTabNavigator';
import {SettingsProvider} from '../context/SettingsContext';
import {ThemeProvider, useTheme} from '../context/ThemeContext';
import {AuthProvider, useAuth} from '../context/AuthContext';
import {ToastProvider} from '../context/ToastContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

// A ref to the root navigator so a sign-out from anywhere (the Settings screen
// sits inside the tab navigator) can reset the whole stack back to the start.
const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Keeps the system status bar icons readable: white icons on the dark theme,
// dark icons on the light theme. Without this the native theme's
// windowLightStatusBar stays true, so the icons are always dark and vanish
// against the dark background.
const ThemedStatusBar: React.FC = () => {
  const {isDark} = useTheme();
  return <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />;
};

// Routes on the restored session: an account that is still signed in goes
// straight to Home, everyone else starts at the welcome screen. The token comes
// from the auth context's ready promise because the state update it follows may
// not have rendered yet.
function SplashWrapper({navigation}: any) {
  const {ready} = useAuth();
  const onFinish = async () => {
    const token = await ready;
    navigation.replace(token ? 'Home' : 'Welcome');
  };
  return <SplashScreen onFinish={onFinish} />;
}

// Onboarding ends at the login screen; the account screens take over from there
// and route to Home once the user is signed in.
function WelcomeWrapper({navigation}: any) {
  const onGetStarted = () => {
    navigation.replace('Login');
  };
  return <WelcomeScreen onGetStarted={onGetStarted} />;
}

// Renders the navigator and reacts to a sign-out by returning everyone to the
// welcome screen, so no screen has to know where "logged out" belongs.
const RootNavigator: React.FC = () => {
  const {token} = useAuth();
  const hadToken = useRef(false);

  useEffect(() => {
    if (token) {
      hadToken.current = true;
      return;
    }
    // Only reset on a sign-out (a token that went away), never on first launch
    // where there was never a session.
    if (hadToken.current) {
      hadToken.current = false;
      if (navigationRef.isReady()) {
        navigationRef.reset({index: 0, routes: [{name: 'Welcome'}]});
      }
    }
  }, [token]);

  return (
    <>
      <ThemedStatusBar />
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}>
          <Stack.Screen name="Splash" component={SplashWrapper} />
          <Stack.Screen name="Welcome" component={WelcomeWrapper} />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{animation: 'slide_from_right'}}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{animation: 'slide_from_right'}}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{animation: 'slide_from_right'}}
          />
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
            name="Subcategory"
            component={SubcategoryScreen}
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
    </>
  );
};

const AppNavigator: React.FC = () => {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <RootNavigator />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
};

export default AppNavigator;
