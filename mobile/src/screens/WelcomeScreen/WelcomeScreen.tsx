import React, {useCallback, useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  AppState,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AlarmPermissionModal from '../../components/AlarmPermissionModal/AlarmPermissionModal';
import CustomText from '../../components/CustomText/CustomText';
import {useTheme} from '../../context/ThemeContext';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

const FEATURES = [
  {icon: '🙏', title: 'Count Mantras', desc: 'Tap to count your mantra'},
  {icon: '🎯', title: 'Set Targets', desc: 'Choose 11, 21, 51, 108 or 1000'},
  {icon: '📊', title: 'Track Progress', desc: 'Visual progress towards your goal'},
];

const openExactAlarmSettings = async (): Promise<void> => {
  try {
    await Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM');
  } catch {
    await Linking.openSettings();
  }
};

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

  // Hooks must live at the top level of the component
  const [alarmModalVisible, setAlarmModalVisible] = useState(false);
  const [alarmLoading, setAlarmLoading] = useState(false);
  const alarmResolveRef = useRef<((v: boolean) => void) | null>(null);

  const askAlarmPermission = useCallback(
    () =>
      new Promise<boolean>(resolve => {
        alarmResolveRef.current = resolve;
        setAlarmModalVisible(true);
      }),
    [],
  );

  const answerAlarmModal = useCallback((answer: boolean) => {
    alarmResolveRef.current?.(answer);
    alarmResolveRef.current = null;
    setAlarmModalVisible(false);
  }, []);

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
          const goToSettings = await askAlarmPermission();
          if (goToSettings) {
            try {
              setAlarmLoading(true);
              await openExactAlarmSettings();
              await waitForForeground();
            } finally {
              setAlarmLoading(false);
            }
          }
        }
      } catch (e) {
        console.log('[WelcomeScreen] Exact alarm permission check failed:', e);
      }
    }

    onGetStarted();
  }, [onGetStarted, askAlarmPermission]);

  const s = styles(colors);

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.container}>
        <View style={s.topSection}>
          {/* <View style={s.logoCircle}> */}
            <Image source={require("../../assets/spiderjapam.png")} style={s.logoImage} resizeMode="contain" />
          {/* </View> */}

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
                <CustomText variant="body" color={colors.secondaryTextColor}>
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
          <CustomText variant="subheading" color={colors.background}>
            Get Started
          </CustomText>
        </TouchableOpacity>
           </View>

      <AlarmPermissionModal
        visible={alarmModalVisible}
        loading={alarmLoading}
        onOpenSettings={() => answerAlarmModal(true)}
        onSkip={() => answerAlarmModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = (colors: import('../../theme/colors').ThemeColors) =>
  StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: colors.background},
    container: {
  flex: 1,
  backgroundColor: colors.background,
  paddingHorizontal: 24,
  justifyContent: 'flex-start', // was 'space-between'
  paddingVertical: 40,
},
topSection: {alignItems: 'center', marginTop: 80},
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
  overflow: 'hidden', // clips the image to the circle
},
logoImage: {
  width: 80,
  height: 80,
   marginBottom: 22,
},
    title: {textAlign: 'center'},
    subtitle: {textAlign: 'center', marginTop: 8},
  featuresSection: {
  flex: 1,
  justifyContent: 'center',
  gap: 24,
},
    featureRow: {flexDirection: 'row', alignItems: 'center', gap: 16},
    featureIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.surfaceLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    featureText: {flex: 1, gap: 4},
  button: {
  backgroundColor: colors.primary,
  paddingVertical: 16,
  borderRadius: 16,
  alignItems: 'center',
  marginTop: 'auto', // keeps the button pinned to the bottom
  marginBottom: 20,
},
  });

export default WelcomeScreen;