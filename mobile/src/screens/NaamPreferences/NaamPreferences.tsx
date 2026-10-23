import React, {useState, useCallback} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import CustomText from '../../components/CustomText/CustomText';
import InlineIcon from '../../components/InlineIcon/InlineIcon';
import LibraryHeader from '../../components/LibraryHeader/LibraryHeader';
import AddNaamBottomSheet from '../../components/AddNaamBottomSheet/AddNaamBottomSheet';
import NoConnectionModal from '../../components/NoConnectionModal/NoConnectionModal';
import {useTheme} from '../../context/ThemeContext';
import {useAuth} from '../../context/AuthContext';
import {Fonts} from '../../theme/fonts';
import {
  getAllNaams,
  getUserNaams,
  selectNaam,
  deleteNaam,
  deleteUserNaam,
  setUserNaamDefault,
  Naam,
} from '../../database/database';
import {
  syncNaamsFromBackend,
  syncUserNaams,
  fetchUserNaams,
  UserNaam,
} from '../../services/api';
import {RootStackParamList} from '../../navigation/types';

type Props = NativeStackNavigationProp<RootStackParamList, 'NaamPreferences'>;

const NaamPreferencesScreen: React.FC = () => {
  const navigation = useNavigation<Props>();
  const {colors} = useTheme();
  const {token} = useAuth();
  const s = styles(colors);

  const [naams, setNaams] = useState<Naam[]>([]);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [editingNaam, setEditingNaam] = useState<Naam | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteNaamTarget, setDeleteNaamTarget] = useState<Naam | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const loadNaams = async () => {
    const data = await getAllNaams();
    // Show only admin naams (those with remote_id, synced from Sacred Library)
    const adminNaams = data.filter(naam => naam.remote_id !== null);
    setNaams(adminNaams);
  };

  // Naams come from the backend (the admin panel). On success the list that is
  // rendered is the one the server returned; on failure the previous list stays
  // on screen and the no-connection modal is shown.
  const refreshFromBackend = async () => {
    const result = await syncNaamsFromBackend();
    if (result.success) {
      setConnectionError(null);
      // Only show admin naams (those with remote_id)
      const adminNaams = (result.naams ?? []).filter((naam: Naam) => naam.remote_id !== null);
      setNaams(adminNaams);
    } else {
      setConnectionError(result.message);
    }
  };

  // Sync user's custom mantras with the server
  const refreshUserNaams = async () => {
    if (!token) return;
    const result = await syncUserNaams(token);
    if (result.success) {
      await loadNaams();
    }
    // Don't set connectionError here - we only display admin naams,
    // so user mantras sync failure shouldn't show "no connection"
  };

  const refreshAll = async () => {
    await refreshFromBackend();
    await refreshUserNaams();
  };

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, [token]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const handleSelect = async (id: number) => {
    await selectNaam(id);
    await loadNaams();
    // Selecting a mantra makes it the counter's active naam. Pop back to the
    // already-registered tab navigator (a plain navigate would push a second
    // copy of the tabs) and switch to the Counter tab, which reads the new
    // selection on focus.
    navigation.popTo('Home', {screen: 'Counter'});
  };

  // Naams that came from the admin panel (is_default = 1) are read-only.
  const handleDelete = (naam: Naam) => {
    if (naam.is_default === 1) {
      return;
    }
    setDeleteNaamTarget(naam);
  };

  const confirmDelete = async () => {
    if (!deleteNaamTarget) {
      return;
    }
    // Use deleteUserNaam for user-created naams (has user_id), deleteNaam for others
    if (deleteNaamTarget.user_id) {
      await deleteUserNaam(deleteNaamTarget.id);
    } else {
      await deleteNaam(deleteNaamTarget.id);
    }
    setDeleteNaamTarget(null);
    await loadNaams();
  };

  const cancelDelete = () => {
    setDeleteNaamTarget(null);
  };

  const handleEdit = (naam: Naam) => {
    if (naam.is_default === 1) {
      return;
    }
    setEditingNaam(naam);
    setShowBottomSheet(true);
  };

  const handleAdd = () => {
    setEditingNaam(null);
    setShowBottomSheet(true);
  };

  const handleBottomSheetClose = () => {
    setShowBottomSheet(false);
    setEditingNaam(null);
    loadNaams();
  };

  // Format bead count for display (keep full number, just ensure it fits)
  const formatBeadCount = (count: number): string => {
    return String(count);
  };

  // Narrowed to the four goal columns so a string field can never be added here
  // and render as "NaN".
  const GOALS: {key: 'daily_goal' | 'weekly_goal' | 'monthly_goal' | 'yearly_goal'; label: string}[] = [
    {key: 'daily_goal', label: 'Daily'},
    {key: 'weekly_goal', label: 'Weekly'},
    {key: 'monthly_goal', label: 'Monthly'},
    {key: 'yearly_goal', label: 'Yearly'},
  ];

  const renderNaamItem = (naam: Naam) => {
    const isSelected = naam.is_selected === 1;
    const isAdmin = naam.remote_id !== null; // Admin naams have remote_id
    const isUserNaam = naam.user_id !== null; // User naams have user_id

    return (
      <Pressable
        key={naam.id}
        onPress={() => handleSelect(naam.id)}
        onLongPress={() => handleEdit(naam)}
        style={({pressed}) => [
          s.card,
          isSelected && s.cardSelected,
          pressed && s.cardPressed,
        ]}
        accessibilityRole="radio"
        accessibilityState={{selected: isSelected}}
        accessibilityLabel={naam.name}>
        <View style={s.cardTop}>
          {/* The badge carries the bead count, which is the number a practitioner
              actually chooses a mala by, so it leads the card. */}
          <View style={[s.badge, isSelected && s.badgeSelected]}>
            <CustomText
              variant="subheading"
              color={isSelected ? colors.background : colors.primary}
              style={s.badgeValue}>
              {formatBeadCount(naam.bead_count)}
            </CustomText>
            <CustomText
              variant="caption"
              color={isSelected ? colors.background : colors.secondaryTextColor}>
              beads
            </CustomText>
          </View>

          <View style={s.cardBody}>
            <CustomText
              variant="subheading"
              color={colors.primaryTextColor}
              numberOfLines={1}>
              {naam.name}
            </CustomText>
            <CustomText variant="body" color={colors.secondaryTextColor}>
              1 mala = {naam.bead_count} beads
            </CustomText>

            {isAdmin ? (
              <View style={s.tag}>
                <CustomText variant="caption" color={colors.secondaryTextColor}>
                  From admin
                </CustomText>
              </View>
            ) : isUserNaam ? (
              <View style={s.tag}>
                <CustomText variant="caption" color={colors.primary}>
                  Your custom mantra
                </CustomText>
              </View>
            ) : null}
          </View>

          <View style={s.cardTrailing}>
            {isSelected ? (
              <View style={s.checkCircle}>
                <InlineIcon name="check" size={14} color={colors.background} />
              </View>
            ) : null}

            {!isAdmin ? (
              <View style={s.actions}>
                <Pressable
                  onPress={() => handleEdit(naam)}
                  style={({pressed}) => [s.iconButton, pressed && s.iconButtonPressed]}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${naam.name}`}>
                  <InlineIcon name="edit" size={18} color={colors.secondaryTextColor} />
                </Pressable>
                {isUserNaam && naam.is_default !== 1 && (
                  <Pressable
                    onPress={() => setUserNaamDefault(naam.user_id!, naam.id).then(loadNaams)}
                    style={({pressed}) => [s.iconButton, pressed && s.iconButtonPressed]}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Set ${naam.name} as default`}>
                    <InlineIcon name="star" size={18} color={colors.primary} />
                  </Pressable>
                )}
                <Pressable
                  onPress={() => handleDelete(naam)}
                  style={({pressed}) => [s.iconButton, pressed && s.iconButtonPressed]}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${naam.name}`}>
                  <InlineIcon name="trash" size={18} color={colors.error} />
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        {/*
          Naams synced from the admin panel have no goals behind them, since the
          content form has no goal fields. The row is dropped for those rather
          than shown as four dashes; locally added naams still have goals.
        */}
        {!isAdmin ? (
          <View style={s.goalsRow}>
            {GOALS.map(goal => {
              const value = naam[goal.key];
              return (
                <View key={goal.label} style={s.goal}>
                  <CustomText variant="caption" color={colors.secondaryTextColor}>
                    {goal.label}
                  </CustomText>
                  <CustomText variant="body" color={colors.primaryTextColor} style={s.goalValue}>
                    {value > 0 ? `${value}m` : '-'}
                  </CustomText>
                </View>
              );
            })}
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <View style={s.header}>
        {/*
          LibraryHeader is a bare View, so it needs the flex itself. Without it
          the bar's own flex:1 title claims the whole row and the add button is
          pushed off the right edge, where Android clips it.
        */}
        <View style={s.headerBar}>
          <LibraryHeader title="Mantra Preferences" onBack={navigation.goBack} />
        </View>
        <Pressable
          style={({pressed}) => [s.addButton, pressed && s.addButtonPressed]}
          onPress={handleAdd}
          accessibilityRole="button"
          accessibilityLabel="Add a naam">
          <InlineIcon name="plus" size={22} color={colors.background} />
        </Pressable>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }>
        {naams.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <InlineIcon name="bead" size={28} color={colors.secondaryTextColor} />
            </View>
            <CustomText variant="subheading" color={colors.primaryTextColor}>
              No mantras yet
            </CustomText>
            <CustomText
              variant="body"
              color={colors.secondaryTextColor}
              style={s.emptyText}>
              Tap the + button to add your first naam, or pull down to sync them from
              the admin panel.
            </CustomText>
          </View>
        ) : (
          naams.map(renderNaamItem)
        )}
      </ScrollView>

      <AddNaamBottomSheet
        visible={showBottomSheet}
        onClose={handleBottomSheetClose}
        editingNaam={editingNaam}
      />

      <NoConnectionModal
        visible={connectionError !== null}
        message={connectionError ?? ''}
        onClose={() => setConnectionError(null)}
        onRetry={onRefresh}
        retrying={refreshing}
      />

      <Modal
        visible={deleteNaamTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalIcon}>
              <InlineIcon name="trash" size={20} color={colors.error} />
            </View>
            <CustomText variant="subheading" color={colors.primaryTextColor}>
              Delete Naam
            </CustomText>
            <CustomText
              variant="body"
              color={colors.secondaryTextColor}
              style={s.modalMessage}>
              "{deleteNaamTarget?.name}" will be removed from this phone. Your
              chanting history for it goes with it.
            </CustomText>
            <View style={s.modalActions}>
              <Pressable
                style={({pressed}) => [s.modalButton, pressed && s.modalButtonPressed]}
                onPress={cancelDelete}
                accessibilityRole="button">
                <CustomText variant="body" color={colors.primaryTextColor}>
                  Cancel
                </CustomText>
              </Pressable>
              <Pressable
                style={({pressed}) => [
                  s.modalButton,
                  s.modalButtonDanger,
                  pressed && s.modalButtonPressed,
                ]}
                onPress={confirmDelete}
                accessibilityRole="button">
                <CustomText variant="body" color={colors.background}>
                  Delete
                </CustomText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = (colors: import('../../theme/colors').ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: 16,
    },
    // Takes the width the add button does not need, so the title truncates
    // instead of pushing the button off screen.
    headerBar: {
      flex: 1,
    },
    addButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButtonPressed: {
      opacity: 0.8,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    // The selected card is the only place the accent border is used, so the
    // current naam is findable at a glance without reading the check mark.
    cardSelected: {
      borderColor: colors.primary,
    },
    cardPressed: {
      opacity: 0.7,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    badge: {
      minWidth: 72,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    badgeSelected: {
      backgroundColor: colors.primary,
    },
    badgeValue: {
      fontFamily: Fonts.bold,
    },
    cardBody: {
      flex: 1,
      gap: 2,
    },
    tag: {
      alignSelf: 'flex-start',
      marginTop: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTrailing: {
      alignItems: 'flex-end',
      gap: 10,
    },
    checkCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actions: {
      flexDirection: 'row',
      gap: 6,
    },
    iconButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconButtonPressed: {
      opacity: 0.7,
    },
    goalsRow: {
      flexDirection: 'row',
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    goal: {
      flex: 1,
      gap: 2,
    },
    goalValue: {
      fontFamily: Fonts.bold,
    },
    empty: {
      alignItems: 'center',
      paddingTop: 72,
      paddingHorizontal: 24,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyText: {
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 21,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
    },
    modalIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    modalMessage: {
      marginTop: 8,
      lineHeight: 21,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: colors.surfaceLight,
    },
    modalButtonDanger: {
      backgroundColor: colors.error,
    },
    modalButtonPressed: {
      opacity: 0.8,
    },
  });

export default NaamPreferencesScreen;
