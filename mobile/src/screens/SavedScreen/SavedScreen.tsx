import React, {useCallback, useState} from 'react';
import {ActivityIndicator, FlatList, Pressable, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import CustomText from '../../components/CustomText/CustomText';
import LibraryHeader from '../../components/LibraryHeader/LibraryHeader';
import InlineIcon from '../../components/InlineIcon/InlineIcon';
import {useTheme} from '../../context/ThemeContext';
import {
  FavoriteContent,
  getFavoriteContents,
  toggleFavoriteContent,
} from '../../database/database';
import {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Saved'>;

/**
 * The readings the user saved from the Sacred Library, kept on the phone.
 *
 * Rows come from local storage, so no network call is needed to render the
 * list. Opening a row goes to the Content screen, which fetches that entry.
 */
const SavedScreen: React.FC<Props> = ({navigation}) => {
  const {colors} = useTheme();
  const s = styles(colors);

  const [saved, setSaved] = useState<FavoriteContent[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    getFavoriteContents()
      .then(setSaved)
      .catch(() => setSaved([]))
      .finally(() => setLoading(false));
  }, []);

  // Reload on focus so a reading saved elsewhere is here by the time the screen
  // is opened again, without a listener that outlives the screen.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const onToggleSaved = useCallback(
    (item: FavoriteContent) => {
      toggleFavoriteContent(item.contentId, item.title).then(() => reload());
    },
    [reload],
  );

  const renderRow = ({item}: {item: FavoriteContent}) => (
    <View style={s.card}>
      <Pressable
        onPress={() => navigation.navigate('Content', {contentId: item.contentId})}
        style={({pressed}) => [s.rowBody, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.title}`}>
        <CustomText variant="subheading" color={colors.primaryTextColor} numberOfLines={1}>
          {item.title}
        </CustomText>
      </Pressable>

      <Pressable
        onPress={() => onToggleSaved(item)}
        hitSlop={12}
        style={s.heart}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.title} from saved`}>
        <InlineIcon name="heart" size={20} color={colors.error} />
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <LibraryHeader title="Saved" onBack={navigation.goBack} />

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={s.spinner} />
      ) : (
        <FlatList
          data={saved}
          keyExtractor={item => String(item.contentId)}
          renderItem={renderRow}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <CustomText variant="body" color={colors.secondaryTextColor} style={s.empty}>
              Nothing saved yet. Tap Save on a reading in the Sacred Library to
              keep it here.
            </CustomText>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = (colors: import('../../theme/colors').ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingBottom: 24,
    },
    spinner: {
      marginTop: 32,
    },
    empty: {
      marginHorizontal: 16,
      marginTop: 12,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginHorizontal: 16,
      marginBottom: 12,
    },
    rowBody: {
      flex: 1,
    },
    pressed: {
      opacity: 0.7,
    },
    heart: {
      padding: 4,
    },
  });

export default SavedScreen;