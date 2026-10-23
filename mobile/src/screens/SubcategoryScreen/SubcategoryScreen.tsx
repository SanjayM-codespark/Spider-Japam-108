import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import CustomText from '../../components/CustomText/CustomText';
import LibraryHeader from '../../components/LibraryHeader/LibraryHeader';
import LibrarySearchBar from '../../components/LibrarySearchBar/LibrarySearchBar';
import SacredContentCard from '../../components/SacredContentCard/SacredContentCard';
import {useTheme} from '../../context/ThemeContext';
import {getFavoriteContentIds, toggleFavoriteContent} from '../../database/database';
import {errorMessage} from '../../services/api';
import {LibraryContent, fetchLibraryContents} from '../../services/library';
import {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Subcategory'>;

/**
 * The published entries in one subcategory, with a search box scoped to that
 * subcategory and a heart on every card.
 */
const SubcategoryScreen: React.FC<Props> = ({navigation, route}) => {
  const {categoryId, subcategoryId, subcategoryName} = route.params;
  const {colors} = useTheme();
  const s = styles(colors);

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
          term
            ? {categoryId, subcategoryId, search: term}
            : {categoryId, subcategoryId},
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
    [categoryId, subcategoryId],
  );

  const load = useCallback(
    async (isRefresh: boolean) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      await fetchFor(searchRef.current);
      isRefresh ? setRefreshing(false) : setLoading(false);
    },
    [fetchFor],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
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
  }, [categoryId, subcategoryId, search, fetchFor]);

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

  const emptyMessage = useMemo(() => {
    if (search.trim()) {
      return `Nothing in ${subcategoryName} matches "${search.trim()}".`;
    }
    return `${subcategoryName} has nothing published yet.`;
  }, [subcategoryName, search]);

  if (loading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <LibraryHeader title={subcategoryName} onBack={navigation.goBack} />
        <ActivityIndicator size="large" color={colors.primary} style={s.spinner} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <LibraryHeader title={subcategoryName} onBack={navigation.goBack} />

      <LibrarySearchBar
        value={search}
        onChangeText={setSearch}
        placeholder={`Search ${subcategoryName}`}
      />

      {error ? (
        <CustomText variant="caption" color={colors.error} style={s.error}>
          {error}
        </CustomText>
      ) : null}

      {searching ? (
        <ActivityIndicator color={colors.primary} style={s.spinnerSmall} />
      ) : (
        <FlatList
          data={contents}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={contents.length === 0 ? s.empty : undefined}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
          ListEmptyComponent={
            <CustomText color={colors.secondaryTextColor}>{emptyMessage}</CustomText>
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
    spinnerSmall: {
      marginTop: 16,
      alignSelf: 'center',
    },
    error: {
      marginHorizontal: 16,
      marginTop: 8,
    },
    empty: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
  });

export default SubcategoryScreen;
