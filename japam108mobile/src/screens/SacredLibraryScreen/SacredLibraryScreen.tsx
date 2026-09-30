import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import CustomText from '../../components/CustomText/CustomText';
import LibrarySearchBar from '../../components/LibrarySearchBar/LibrarySearchBar';
import {useTheme} from '../../context/ThemeContext';
import {assetUrl} from '../../config/apiConfig';
import {
  LibraryCategory,
  categoryInitial,
  fetchLibrary,
} from '../../services/library';
import {RootStackParamList} from '../../navigation/types';
import {errorMessage} from '../../services/api';
import {Fonts} from '../../theme/fonts';

type CategoryTileProps = {
  category: LibraryCategory;
  onPress: () => void;
};

/**
 * One category in the grid: the category picture on top, the name underneath.
 *
 * The picture gets a real height rather than a thin strip, because a wide tile
 * cropped to a few pixels tall reads as a broken image. If the file is missing
 * the server answers with an HTML error page rather than a 404 image, so
 * `onError` swaps in the category's letter instead of leaving an empty box.
 */
export const CategoryTile: React.FC<CategoryTileProps> = ({category, onPress}) => {
  const {colors} = useTheme();
  const s = styles(colors);
  const [imageFailed, setImageFailed] = useState(false);

  const image = assetUrl(category.image_url);
  const showImage = Boolean(image) && !imageFailed;

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [s.tile, pressed && s.pressed]}
      accessibilityRole="button"
      accessibilityLabel={category.name}>
      {showImage ? (
        <Image
          source={{uri: image as string}}
          style={s.image}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View style={s.placeholder}>
          <CustomText variant="heading" color={colors.secondaryTextColor}>
            {categoryInitial(category)}
          </CustomText>
        </View>
      )}
      <View style={s.label}>
        <CustomText color={colors.primaryTextColor} numberOfLines={2} style={s.name}>
          {category.name}
        </CustomText>
      </View>
    </Pressable>
  );
};

/**
 * The Sacred Library landing screen: a search box and a two column grid of
 * categories.
 *
 * The search box filters that grid. `fetchLibrary` already returns every active
 * category, so the match runs on what is in memory and there is no request per
 * keystroke. Matching is on the category name alone, which is the one field a
 * tile shows as a label.
 *
 * Content search lives one level down, on the category screen, which is already
 * scoped to a single category.
 */
const SacredLibraryScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {colors} = useTheme();
  const s = styles(colors);

  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const term = search.trim();

  const load = useCallback(async (isRefresh: boolean) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const library = await fetchLibrary();
      setCategories(library.categories);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  // Case insensitive, on the name only. The description is deliberately left
  // out: it is admin free text that is often a placeholder, and matching it
  // surfaced categories whose name has nothing to do with the term.
  const visibleCategories = useMemo(() => {
    if (!term) {
      return categories;
    }
    const needle = term.toLowerCase();
    return categories.filter(category => (category.name ?? '').toLowerCase().includes(needle));
  }, [categories, term]);

  const openCategory = useCallback(
    (category: LibraryCategory) => {
      navigation.navigate('Category', {categoryId: category.id, categoryName: category.name});
    },
    [navigation],
  );

  const renderTile = useCallback(
    ({item}: {item: LibraryCategory}) => (
      <CategoryTile category={item} onPress={() => openCategory(item)} />
    ),
    [openCategory],
  );

  if (loading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <CustomText variant="heading" color={colors.primaryTextColor} style={s.title}>
        Sacred Library
      </CustomText>

      <LibrarySearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search categories"
      />

      {error ? (
        <CustomText variant="caption" color={colors.error} style={s.error}>
          {error}
        </CustomText>
      ) : null}

      <FlatList
        data={visibleCategories}
        keyExtractor={item => String(item.id)}
        renderItem={renderTile}
        numColumns={2}
        columnWrapperStyle={s.row}
        contentContainerStyle={s.gridContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <CustomText variant="subheading" color={colors.primaryTextColor} style={s.section}>
              {term ? 'Matching categories' : 'Categories'}
            </CustomText>
          </View>
        }
        ListEmptyComponent={
          <CustomText variant="body" color={colors.secondaryTextColor} style={s.gridEmpty}>
            {term ? `No categories match "${term}".` : 'No categories are available yet.'}
          </CustomText>
        }
      />
    </SafeAreaView>
  );
};

const styles = (colors: import('../../theme/colors').ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    title: {
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 14,
    },
    error: {
      marginHorizontal: 16,
      marginBottom: 12,
    },
    gridContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    gridEmpty: {
      marginTop: 8,
    },
    row: {
      gap: 12,
    },
    section: {
      marginTop: 4,
      marginBottom: 12,
    },
    // The card has no padding of its own: the picture runs to the edges so the
    // rounded corners clip it, and the name sits in its own padded block. That
    // keeps the text from crowding the image at any grid width.
    tile: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 12,
    },
    pressed: {
      opacity: 0.7,
    },
    image: {
      width: '100%',
      height: 96,
      backgroundColor: colors.surfaceLight,
    },
    placeholder: {
      height: 96,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceLight,
    },
    label: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      // A fixed floor keeps names on one line and two line names on the same
      // row height, so the grid does not look ragged.
      minHeight: 56,
      justifyContent: 'center',
    },
    name: {
      fontSize: 15,
      lineHeight: 20,
      fontFamily: Fonts.semiBold,
    },
  });

export default SacredLibraryScreen;
