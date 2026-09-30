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

type Props = NativeStackScreenProps<RootStackParamList, 'Category'>;

/**
 * The published entries in one category, with a search box scoped to that
 * category and a heart on every card.
 */
const CategoryScreen: React.FC<Props> = ({navigation, route}) => {
  const {categoryId, categoryName} = route.params;
  const {colors} = useTheme();
  const s = styles(colors);

  const [contents, setContents] = useState<LibraryContent[]>([]);
  const [search, setSearch] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  /**
   * The search term the list on screen actually reflects. null means the list
   * has not been fetched yet. It is what lets the search effect tell "already
   * showing the whole category" apart from "showing a filtered list", so
   * clearing the box refetches once instead of on every keystroke back to
   * empty, and the mount load is not repeated by the search effect.
   */
  const loadedTermRef = useRef<string | null>(null);

  /**
   * Identifies the newest request. clearTimeout only cancels a timer that has
   * not fired yet, so a request already on the wire still lands; comparing the
   * sequence lets a stale response be dropped instead of replacing the list
   * the user is now looking at.
   */
  const requestRef = useRef(0);

  /** Lets pull to refresh reuse the current term without re-running effects. */
  const searchRef = useRef('');
  useEffect(() => {
    searchRef.current = search.trim();
  }, [search]);

  // Reload on focus, not just mount, so a save or unsave performed on the
  // Content screen is reflected when the user comes back to this list.
  useFocusEffect(
    useCallback(() => {
      getFavoriteContentIds()
        .then(setFavoriteIds)
        .catch(() => setFavoriteIds([]));
    }, []),
  );

  /**
   * The one place the list is fetched, for any term. An empty term asks for the
   * whole category, which is what the search box returns to when it is cleared.
   */
  const fetchFor = useCallback(
    async (term: string) => {
      const request = ++requestRef.current;
      // Claimed up front, not on success, so the search effect knows the term
      // is already on its way and does not ask for the same list again while
      // this request is still in flight.
      loadedTermRef.current = term;
      setSearching(true);
      try {
        const found = await fetchLibraryContents(
          term ? {categoryId, search: term} : {categoryId},
        );
        // A newer request has already answered, so this one is stale.
        if (requestRef.current !== request) {
          return;
        }
        setContents(found);
        setError('');
      } catch (err) {
        if (requestRef.current === request) {
          setError(errorMessage(err));
          // The term is not really on screen, so let a later attempt retry.
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

  /**
   * The first load and pull to refresh. Both keep whatever term is in the box,
   * since refreshing a filtered list should not quietly show the whole
   * category behind a search term that is still on screen.
   */
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

  // Debounced so each keystroke does not become a request. The timer is cleared
  // on every change, which also drops the response for a term the user has
  // already moved on from.
  useEffect(() => {
    const term = search.trim();

    if (!term) {
      // Clearing the box has to bring the whole category back. Returning
      // early here is what left the last filtered result on screen, so the
      // empty message claimed nothing was published while the category was
      // full. Nothing to do when the list already shows it all.
      if (loadedTermRef.current === '') {
        setSearching(false);
        return;
      }
      fetchFor('');
      return;
    }

    const timer = setTimeout(() => fetchFor(term), 300);
    return () => clearTimeout(timer);
  }, [categoryId, search, fetchFor]);

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
      return `Nothing in ${categoryName} matches "${search.trim()}".`;
    }
    return `${categoryName} has nothing published yet.`;
  }, [categoryName, search]);

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

      {searching ? (
        <ActivityIndicator color={colors.primary} style={s.spinnerSmall} />
      ) : (
        <FlatList
          data={contents}
          keyExtractor={item => String(item.id)}
          renderItem={({item}) => (
            <SacredContentCard
              content={item}
              isFavorite={isFavorite(item.id)}
              onPress={() => navigation.navigate('Content', {contentId: item.id})}
              onToggleFavorite={() => onToggleFavorite(item)}
            />
          )}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <CustomText variant="body" color={colors.secondaryTextColor} style={s.empty}>
              {emptyMessage}
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
    error: {
      marginHorizontal: 16,
      marginBottom: 12,
    },
    empty: {
      marginHorizontal: 16,
      marginTop: 12,
    },
    spinner: {
      marginTop: 32,
    },
    spinnerSmall: {
      marginTop: 20,
    },
  });

export default CategoryScreen;
