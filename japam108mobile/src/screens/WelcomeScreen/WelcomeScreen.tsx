import React, {useCallback} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  AppState,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText/CustomText';
import {useTheme} from '../../context/ThemeContext';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

const FEATURES = [
  {icon: '🙏', title: 'Count Mantras', desc: 'Tap to count your naam jap'},
  {icon: '🎯', title: 'Set Targets', desc: 'Choose 11, 21, 51, 108 or 1000'},
  {icon: '📊', title: 'Track Progress', desc: 'Visual progress towards your goal'},
];

/**
 * The exact-alarm permission has no system dialog, so taking the user to the
 * settings toggle is a step of its own. This opens the dedicated
 * "Alarms & reminders" page and falls back to the app info screen when the
 * action is not known (older devices grant the permission automatically).
 */
const openExactAlarmSettings = async (): Promise<void> => {
  try {
    await Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM');
  } catch {
    await Linking.openSettings();
  }
};

/**
 * Waits until the app is back in the foreground. Onboarding must not advance
 * while the OS settings screen is covering the app, or the whole step would be
 * skipped before the user had a chance to flip the switch.
 */
const waitForForeground = (): Promise<void> =>
  new Promise(resolve => {
    if (AppState.currentState === 'active') {
      resolve();
      return;
    }
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        subscription.remove();
        resolve();
      }
    });
  });

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({onGetStarted}) => {
  const {colors} = useTheme();

  const handleGetStarted = useCallback(async () => {
    console.log('[WelcomeScreen] Requesting notification permission...');
    try {
      const notifee = (await import('@notifee/react-native')).default;
      const {AuthorizationStatus} = await import('@notifee/react-native');
      const settings = await notifee.getNotificationSettings();
      console.log('[WelcomeScreen] Current auth status:', settings.authorizationStatus);
      if (settings.authorizationStatus !== AuthorizationStatus.AUTHORIZED) {
        console.log('[WelcomeScreen] Calling requestPermission...');
        const requestPromise = notifee.requestPermission();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Permission request timeout')), 10000),
        );
        const result = (await Promise.race([requestPromise, timeoutPromise])) as {
          authorizationStatus: number;
        };
        console.log('[WelcomeScreen] Request result:', result.authorizationStatus);
      }
    } catch (e) {
      console.error('[WelcomeScreen] Permission request failed:', e);
    }

    // Exact alarms (Android 12+) cannot be prompted with a dialog; the toggle
    // lives in the system settings. Ask whether to go there, and hold onboarding
    // until the user comes back, so the step cannot be silently skipped.
    if (Platform.OS === 'android') {
      try {
        const notifee = (await import('@notifee/react-native')).default;
        const {AndroidNotificationSetting} = await import('@notifee/react-native');
        const alarmSettings = await notifee.getNotificationSettings();
        if (alarmSettings.android?.alarm !== AndroidNotificationSetting.ENABLED) {
          const goToSettings = await new Promise<boolean>(resolve => {
            Alert.alert(
              'Enable alarm delivery',
              'Phone battery saver can delay reminders unless "Alarms & reminders" is allowed for Japam108. Turn it on in the settings that open next.',
              [
                {text: 'Skip for now', style: 'cancel', onPress: () => resolve(false)},
                {text: 'Open Settings', onPress: () => resolve(true)},
              ],
            );
          });
          if (goToSettings) {
            console.log('[WelcomeScreen] Opening exact alarm settings...');
            await openExactAlarmSettings();
            await waitForForeground();
          }
        }
      } catch (e) {
        console.log('[WelcomeScreen] Exact alarm permission check failed:', e);
      }
    }

    onGetStarted();
  }, [onGetStarted]);

  const s = styles(colors);

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.container}>
        <View style={s.topSection}>
          <View style={s.logoCircle}>
            <CustomText variant="heading" color={colors.primary}>
              ॐ
            </CustomText>
          </View>

          <CustomText variant="heading" style={s.title}>
            Japam108
          </CustomText>
          <CustomText
            variant="body"
            color={colors.secondaryTextColor}
            style={s.subtitle}>
            Your spiritual counting companion
          </CustomText>
        </View>

        <View style={s.featuresSection}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={s.featureRow}>
              <View style={s.featureIcon}>
                <CustomText variant="heading">{feature.icon}</CustomText>
              </View>
              <View style={s.featureText}>
                <CustomText variant="subheading">{feature.title}</CustomText>
                <CustomText
                  variant="body"
                  color={colors.secondaryTextColor}>
                  {feature.desc}
                </CustomText>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={s.button}
          onPress={handleGetStarted}
          activeOpacity={0.8}>
          <CustomText variant="subheading" color={colors.primaryTextColor}>
            Get Started
          </CustomText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = (colors: import('../../theme/colors').ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 24,
      justifyContent: 'space-between',
      paddingVertical: 40,
    },
    topSection: {
      alignItems: 'center',
      marginTop: 40,
    },
    logoCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.surfaceLight,
      borderWidth: 2,
      borderColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      textAlign: 'center',
    },
    subtitle: {
      textAlign: 'center',
      marginTop: 8,
    },
    featuresSection: {
      gap: 24,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    featureIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.surfaceLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    featureText: {
      flex: 1,
      gap: 4,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
      marginBottom: 20,
    },
  });

export default WelcomeScreen;