import React, {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import CustomText from '../../components/CustomText/CustomText';
import LibraryHeader from '../../components/LibraryHeader/LibraryHeader';
import {useTheme} from '../../context/ThemeContext';
import {APP_VERSION, FALLBACK_APP_NAME} from '../../config/appLinks';
import {fetchAppSettings} from '../../services/api';
import {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'About'>;

/**
 * "About <app name>", the one row in Settings > About & Legal that is not a help
 * page.
 *
 * The name comes from the admin panel so it matches what the Invite sheet says,
 * with the bundled fallback when the backend cannot be reached. The fetch never
 * blocks the screen: the name is rendered as soon as it arrives, or immediately
 * from the fallback if it never does.
 */
const AboutScreen: React.FC<Props> = ({navigation}) => {
  const {colors} = useTheme();
  const s = styles(colors);

  const [appName, setAppName] = useState(FALLBACK_APP_NAME);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const settings = await fetchAppSettings();
        if (active && settings.app_name) {
          setAppName(settings.app_name);
        }
      } catch {
        // Offline or the backend address is wrong: the bundled name still
        // identifies the app, which is all this screen needs.
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <LibraryHeader title={`About ${appName}`} onBack={navigation.goBack} />

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>
        <CustomText variant="subheading" color={colors.primaryTextColor}>
          {appName}
        </CustomText>

        {loading ? (
          <ActivityIndicator
            color={colors.primary}
            style={s.loader}
          />
        ) : (
          <CustomText
            variant="body"
            color={colors.secondaryTextColor}
            style={s.version}>
            Version {APP_VERSION}
          </CustomText>
        )}

        <CustomText
          variant="body"
          color={colors.primaryTextColor}
          style={s.body}>
          {appName} is a naam jap counter for keeping a daily chanting practice. Count
          your mantras, follow your streak, and read the Sacred Library.
        </CustomText>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = (colors: import('../../theme/colors').ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    loader: {
      marginTop: 8,
    },
    version: {
      marginTop: 4,
    },
    body: {
      marginTop: 24,
      lineHeight: 22,
    },
  });

export default AboutScreen;
