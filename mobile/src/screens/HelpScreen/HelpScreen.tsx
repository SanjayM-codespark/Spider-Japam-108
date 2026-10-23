import React, {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import CustomText from '../../components/CustomText/CustomText';
import HtmlContent from '../../components/HtmlContent/HtmlContent';
import LibraryHeader from '../../components/LibraryHeader/LibraryHeader';
import {useTheme} from '../../context/ThemeContext';
import {errorMessage} from '../../services/api';
import {Help, fetchHelp} from '../../services/help';
import {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Help'>;

/**
 * One help page, opened from Settings > About & Legal.
 *
 * The title is passed in through the route so the header is right immediately,
 * then replaced by the fetched one. The body is the rich text an admin wrote in
 * the panel, rendered by HtmlContent.
 */
const HelpScreen: React.FC<Props> = ({navigation, route}) => {
  const {helpId, title} = route.params;
  const {colors} = useTheme();
  const s = styles(colors);

  const [help, setHelp] = useState<Help | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const page = await fetchHelp(helpId);
        if (active) {
          setHelp(page);
        }
      } catch (err) {
        if (active) {
          setError(errorMessage(err));
        }
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
  }, [helpId]);

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <LibraryHeader title={help?.title || title} onBack={navigation.goBack} />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}>
          {error ? (
            <CustomText variant="body" color={colors.error}>
              {error}
            </CustomText>
          ) : (
            // The admin stores rich text, so it is rendered as markup rather
            // than printed as a plain string with the tags visible.
            <HtmlContent html={help?.content || ''} />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = (colors: import('../../theme/colors').ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
  });

export default HelpScreen;
