import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import CustomText from '../../components/CustomText/CustomText';
import LibraryHeader from '../../components/LibraryHeader/LibraryHeader';
import LibrarySearchBar from '../../components/LibrarySearchBar/LibrarySearchBar';
import SacredContentCard from '../../components/SacredContentCard/SacredContentCard';
import {useTheme} from '../../context/ThemeContext';
import {assetUrl} from '../../config/apiConfig';
import {getFavoriteContentIds, toggleFavoriteContent} from '../../database/database';
import {errorMessage} from '../../services/api';
import {
  LibraryContent,
  LibrarySubcategory,
  categoryInitial,
  fetchLibraryContents,
  fetchLibrarySubcategories,
} from '../../services/library';
import {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Category'>;

type SubcategoryTileProps = {
  subcategory: LibrarySubcategory;
  onPress: () => void;
};

const SubcategoryTile: React.FC<SubcategoryTileProps> = ({subcategory, onPress}) => {
  const {colors} = useTheme();
  const s = styles(colors);
  const [imageFailed, setImageFailed] = useState(false);

  const image = assetUrl(subcategory.image_url);
  const showImage = Boolean(image) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [s.tile, pressed && s.pressed]}
      accessibilityRole="button"
      accessibilityLabel={subcategory.name}>
      {showImage ? (
        <Image
          source={{uri: image as string}}
          style={s.image}
          resizeMode="contain"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View style={s.placeholder}>
          <CustomText variant="heading" color={colors.secondaryTextColor}>
            {categoryInitial(subcategory)}
          </CustomText>
        </View>
      )}
      <View style={s.label}>
        <CustomText color={colors.primaryTextColor} numberOfLines={2} style={s.name}>
          {subcategory.name}
        </CustomText>
      </View>
    </Pressable>
  );
};

/**
 * Category screen.
 *
 * When the category has subcategories the entries are grouped behind a
 * subcategory grid, so the reader drills category -> subcategory -> content.
 * A category without subcategories keeps the original behaviour and lists its
 * entries directly, with the server-side, debounced search box.
 */
const CategoryScreen: React.FC<Props> = ({navigation, route}) => {
  const {categoryId, categoryName} = route.params;
  const {colors} = useTheme();
  const s = styles(colors);

  const [subcategories, setSubcategories] = useState<LibrarySubcategory[]>([]);
  const [mode, setMode] = useState<'subs' | 'contents'>('subs');
  const [contents, setContents] = useState<LibraryContent[]>([]);
  const [search, setSearch] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const loadedTermRef = useRef<string | null>(null);
  const requestRef = useRef(0);
  const searchRef = useRef('');

  useEffect(() => {
    searchRef.current = search.trim();
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      getFavoriteContentIds()
        .then(setFavoriteIds)
        .catch(() => setFavoriteIds([]));
    }, []),
  );

  const fetchFor = useCallback(
    async (term: string) => {
      const request = ++requestRef.current;
      loadedTermRef.current = term;
      setSearching(true);
      try {
        const found = await fetchLibraryContents(
          term ? {categoryId, search: term} : {categoryId},
        );
        if (requestRef.current !== request) {
          return;
        }
        setContents(found);
        setError('');
      } catch (err) {
        if (requestRef.current === request) {
          setError(errorMessage(err));
          loadedTermRef.current = null;
        }
      } finally {
        if (requestRef.current === request) {
          setSearching(false);
        }
      }
    },
    [categoryId],
  );

  const load = useCallback(
    async (isRefresh: boolean) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      try {
        let subs: LibrarySubcategory[] = [];
        try {
          subs = await fetchLibrarySubcategories(categoryId);
        } catch {
          subs = [];
        }

        if (subs.length > 0) {
          setSubcategories(subs);
          setContents([]);
          setMode('subs');
          setError('');
          return;
        }

        setSubcategories([]);
        setMode('contents');
        await fetchFor(searchRef.current);
      } finally {
        isRefresh ? setRefreshing(false) : setLoading(false);
      }
    },
    [categoryId, fetchFor],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
    if (mode !== 'contents') {
      return;
    }

    const term = search.trim();

    if (!term) {
      if (loadedTermRef.current === '') {
        setSearching(false);
        return;
      }
      fetchFor('');
      return;
    }

    const timer = setTimeout(() => fetchFor(term), 300);
    return () => clearTimeout(timer);
  }, [categoryId, mode, search, fetchFor]);

  const onToggleFavorite = useCallback(async (content: LibraryContent) => {
    try {
      const saved = await toggleFavoriteContent(content.id, content.title);
      setFavoriteIds(previous =>
        saved
          ? [content.id, ...previous.filter(id => id !== content.id)]
          : previous.filter(id => id !== content.id),
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  const isFavorite = useCallback((id: number) => favoriteIds.includes(id), [favoriteIds]);

  const term = search.trim();
  const visibleSubs = useMemo(() => {
    if (!term) {
      return subcategories;
    }
    const needle = term.toLowerCase();
    return subcategories.filter(sub => (sub.name ?? '').toLowerCase().includes(needle));
  }, [subcategories, term]);

  const visibleContents = useMemo(() => {
    if (!term) {
      return contents;
    }
    const needle = term.toLowerCase();
    return contents.filter(
      c =>
        (c.title ?? '').toLowerCase().includes(needle) ||
        (c.short_description ?? '').toLowerCase().includes(needle),
    );
  }, [contents, term]);

  if (loading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <LibraryHeader title={categoryName} onBack={navigation.goBack} />
        <ActivityIndicator size="large" color={colors.primary} style={s.spinner} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <LibraryHeader title={categoryName} onBack={navigation.goBack} />
      <LibrarySearchBar
        value={search}
        onChangeText={setSearch}
        placeholder={`Search ${categoryName}`}
      />

      {error ? (
        <CustomText variant="caption" color={colors.error} style={s.error}>
          {error}
        </CustomText>
      ) : null}

      {mode === 'subs' ? (
        <FlatList
          data={visibleSubs}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          columnWrapperStyle={s.column}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListEmptyComponent={
            <CustomText color={colors.secondaryTextColor} style={s.empty}>
              {term ? `Nothing matches "${term}".` : `${categoryName} has no subcategories yet.`}
            </CustomText>
          }
          renderItem={({item}) => (
            <SubcategoryTile
              subcategory={item}
              onPress={() =>
                navigation.navigate('Subcategory', {
                  categoryId,
                  categoryName,
                  subcategoryId: item.id,
                  subcategoryName: item.name,
                })
              }
            />
          )}
        />
      ) : searching ? (
        <ActivityIndicator color={colors.primary} style={s.spinner} />
      ) : (
        <FlatList
          data={visibleContents}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={visibleContents.length === 0 ? s.empty : undefined}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListEmptyComponent={
            <CustomText color={colors.secondaryTextColor}>
              {term
                ? `Nothing in ${categoryName} matches "${term}".`
                : `${categoryName} has nothing published yet.`}
            </CustomText>
          }
          renderItem={({item}) => (
            <SacredContentCard
              content={item}
              isFavorite={isFavorite(item.id)}
              onToggleFavorite={() => onToggleFavorite(item)}
              onPress={() => navigation.navigate('Content', {contentId: item.id})}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = (colors: any) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    spinner: {
      marginTop: 40,
    },
    error: {
      marginHorizontal: 16,
      marginTop: 8,
    },
    column: {
      paddingHorizontal: 16,
      gap: 12,
    },
    tile: {
      flex: 1,
      // With numColumns={2} a lone tile would stretch across the whole row.
      // Capping it at half the row keeps one subcategory the same size as the
      // two column grid.
      maxWidth: '50%',
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
    // A square picture area keeps the grid rows level, and `contain` (see the
    // Image above) shows the whole upload instead of cropping it. Mirrors the
    // category tile on the library screen so both grids look the same.
    image: {
      width: '100%',
      aspectRatio: 1,
      backgroundColor: colors.surfaceLight,
    },
    placeholder: {
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surfaceLight,
    },
    label: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      minHeight: 56,
      justifyContent: 'center',
    },
    name: {
      fontSize: 15,
      lineHeight: 20,
      fontFamily: 'OpenSans-Bold',
      textAlign: 'center',
    },
    empty: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      textAlign: 'center',
    },
  });

export default CategoryScreen;
