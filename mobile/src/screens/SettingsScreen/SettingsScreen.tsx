import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Keyboard,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import CustomText from '../../components/CustomText/CustomText';
import InlineIcon from '../../components/InlineIcon/InlineIcon';
import {ConfirmModal, EditProfileModal, ChangePasswordSheet} from '../../components';
import {useTheme} from '../../context/ThemeContext';
import {useAuth} from '../../context/AuthContext';
import {useToast} from '../../context/ToastContext';
import {Fonts} from '../../theme/fonts';
import {UpdateProfileInput} from '../../services/auth';
import {
  addNaamLog,
  formatDateKey,
  getSelectedNaam,
  resetDailyCount,
  Naam,
} from '../../database/database';
import {AddLogSheet, CalendarSheet} from '../CounterScreen/CounterScreen';
import NaamJapRemindersSheet from '../../components/NaamJapRemindersSheet/NaamJapRemindersSheet';
import InviteFriendsSheet from '../../components/InviteFriendsSheet/InviteFriendsSheet';
import {RootStackParamList} from '../../navigation/types';
import {errorMessage, fetchAppSettings} from '../../services/api';
import {HelpSummary, fetchHelps} from '../../services/help';
import {FALLBACK_APP_NAME} from '../../config/appLinks';

type SettingsNavProp = NativeStackNavigationProp<RootStackParamList>;

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsNavProp>();
  const {isDark, colors, setTheme} = useTheme();
  const {user, signOut, deleteAccount, updateProfile} = useAuth();
  const {showToast} = useToast();
  const [streakReminder, setStreakReminder] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [logDate, setLogDate] = useState<Date>(new Date());
  const [addLogSheetOpen, setAddLogSheetOpen] = useState(false);
  const [selectedNaam, setSelectedNaam] = useState<Naam | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarSelected, setCalendarSelected] = useState<string | null>(null);
  const [calendarResetConfirm, setCalendarResetConfirm] = useState(false);
  const resetConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [remindersSheetOpen, setRemindersSheetOpen] = useState(false);
  const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [changePasswordSheetOpen, setChangePasswordSheetOpen] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState<UpdateProfileInput>({
    name: '',
    email: '',
    phone: '',
    country_code: '',
  });
  const [editProfileErrors, setEditProfileErrors] = useState<Record<string, string>>({});
  const [editProfileLoading, setEditProfileLoading] = useState(false);
  // The About & Legal section. `appName` labels the About row, and `helps` are
  // the pages an admin wrote in the admin panel: the row label of each is that
  // page's title, so the panel controls what this section lists.
  const [appName, setAppName] = useState(FALLBACK_APP_NAME);
  const [helps, setHelps] = useState<HelpSummary[]>([]);
  const [helpsError, setHelpsError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      // The name is a nicety on a row label, so a failure here is ignored and
      // the bundled name stands.
      fetchAppSettings()
        .then(settings => {
          if (active && settings.app_name) {
            setAppName(settings.app_name);
          }
        })
        .catch(() => {});

      try {
        const pages = await fetchHelps();
        if (active) {
          setHelps(pages);
        }
      } catch (err) {
        if (active) {
          setHelpsError(errorMessage(err));
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const openCalendar = () => {
    setCalendarSelected(null);
    setCalendarResetConfirm(false);
    setCalendarOpen(true);
  };

  const shiftCalendar = (direction: -1 | 1) => {
    setCalendarMonth(prev => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + direction);
      return next;
    });
    setCalendarResetConfirm(false);
  };

  const selectCalendarDay = (key: string) => {
    setCalendarSelected(key);
    setCalendarResetConfirm(false);
  };

  const handleResetCount = () => {
    if (!calendarResetConfirm) {
      setCalendarResetConfirm(true);
      if (resetConfirmTimerRef.current) {
        clearTimeout(resetConfirmTimerRef.current);
      }
      resetConfirmTimerRef.current = setTimeout(() => {
        setCalendarResetConfirm(false);
      }, 3000);
      return;
    }
    if (resetConfirmTimerRef.current) {
      clearTimeout(resetConfirmTimerRef.current);
      resetConfirmTimerRef.current = null;
    }
    setCalendarResetConfirm(false);
    if (calendarSelected) {
      resetDailyCount(calendarSelected).then(() => {
        setCalendarOpen(false);
        Alert.alert(
          'Reset Complete',
          'Your count for the selected date has been reset to zero.',
        );
      });
    }
  };

  const openAddLogSheet = () => {
    getSelectedNaam().then(n => {
      if (n) {
        setSelectedNaam(n);
      }
    });
    setAddLogSheetOpen(true);
  };

  const handleAddLog = (count: number) => {
    if (selectedNaam) {
      addNaamLog(selectedNaam.id, formatDateKey(logDate), count).then(() => {
        setAddLogSheetOpen(false);
        Alert.alert('Log Added', 'Your naam log has been saved.');
      });
    }
  };

  const handleBackup = () => {
    Alert.alert('Backup', 'Backup functionality coming soon!');
  };

  const handleRestore = () => {
    Alert.alert('Restore', 'Restore functionality coming soon!');
  };

  const handleFeedback = () => {
    Alert.alert('Feedback', 'Thank you for your interest! Feedback form coming soon.');
  };

  const handleInvite = () => {
    setInviteSheetOpen(true);
  };

  const handleSupport = () => {
    Alert.alert('Support', 'Contact support coming soon.');
  };

  const openLogoutModal = () => setLogoutModalVisible(true);
  const closeLogoutModal = () => setLogoutModalVisible(false);

  const handleLogoutConfirm = () => {
    closeLogoutModal();
    signOut();
    showToast('Logged out successfully', 'success');
  };

  const openDeleteAccountModal = () => setDeleteAccountModalVisible(true);
  const closeDeleteAccountModal = () => setDeleteAccountModalVisible(false);

  const handleDeleteAccountConfirm = async () => {
    closeDeleteAccountModal();
    try {
      await deleteAccount();
      showToast('Account deleted successfully', 'success');
    } catch (err) {
      showToast('Failed to delete account. Please try again.', 'error');
    }
  };

  const openEditProfileModal = () => {
    if (user) {
      setEditProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        country_code: user.country_code || '',
      });
      setEditProfileErrors({});
      setEditProfileModalVisible(true);
    }
  };

  const closeEditProfileModal = () => {
    setEditProfileModalVisible(false);
  };

  const handleEditProfileSubmit = async () => {
    // Basic validation
    const errors: Record<string, string> = {};
    if (!editProfileForm.name.trim() || editProfileForm.name.trim().length < 2) {
      errors.name = 'Please enter your name (at least 2 characters).';
    }
    if (!editProfileForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editProfileForm.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    if (editProfileForm.phone.trim() && (
      !/^\+?[0-9()\-\s]+$/.test(editProfileForm.phone.trim()) ||
      editProfileForm.phone.replace(/\D/g, '').length < 7 ||
      editProfileForm.phone.replace(/\D/g, '').length > 15
    )) {
      errors.phone = 'Enter a valid phone number.';
    }
    if (!editProfileForm.country_code.trim()) {
      errors.country_code = 'Select a country code.';
    }

    setEditProfileErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setEditProfileLoading(true);
    Keyboard.dismiss();
    try {
      await updateProfile({
        name: editProfileForm.name.trim(),
        email: editProfileForm.email.trim().toLowerCase(),
        phone: editProfileForm.phone.trim(),
        country_code: editProfileForm.country_code.trim(),
      });
      closeEditProfileModal();
      showToast('Profile updated successfully', 'success');
    } catch (err) {
      // Handle field errors from API
      if (err && typeof err === 'object' && 'errors' in err) {
        setEditProfileErrors((err as {errors: Record<string, string>}).errors);
      } else if (err instanceof Error) {
        showToast(err.message, 'error');
      } else {
        showToast('Failed to update profile. Please try again.', 'error');
      }
    } finally {
      setEditProfileLoading(false);
    }
  };

  const s = styles(colors);

  const renderSectionHeader = (title: string) => (
    <View style={s.sectionHeader}>
      <CustomText variant="subheading" color={colors.primaryTextColor} style={s.sectionTitle}>
        {title}
      </CustomText>
    </View>
  );

  const renderSettingRow = (
    label: string,
    description?: string,
    rightElement?: React.ReactNode,
    onPress?: () => void,
  ) => (
    <TouchableOpacity
      style={s.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}>
      <View style={s.settingTextContainer}>
        <CustomText variant="body" color={colors.primaryTextColor} style={s.settingLabel}>
          {label}
        </CustomText>
        {description && (
          <CustomText variant="caption" color={colors.secondaryTextColor}>
            {description}
          </CustomText>
        )}
      </View>
      {rightElement}
    </TouchableOpacity>
  );

  const renderChevron = () => (
    <InlineIcon name="keyboardArrowRight" size={22} color={colors.secondaryTextColor} />
  );

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <View style={s.header}>
        <CustomText variant="heading" color={colors.primaryTextColor} style={s.title}>
          Settings
        </CustomText>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Chanting Settings */}
        {renderSectionHeader('Chanting Settings')}
        <View style={s.sectionCard}>
          {renderSettingRow(
            'Mantra Preferences',
            'Set your preferred mantra and target count',
            renderChevron(),
            () => navigation.navigate('NaamPreferences'),
          )}
          <View style={s.separator} />
          {renderSettingRow(
            'Add Mantra Logs',
            'View and manage your chanting history',
            renderChevron(),
            openAddLogSheet,
          )}
          <View style={s.separator} />
          {renderSettingRow(
            'Reset Count',
            'Set your current mantra count back to zero',
              <CustomText variant="body" color={colors.error}>
                Reset
              </CustomText>,
            openCalendar,
          )}
          <View style={s.separator} />
          {renderSettingRow(
            'Saved',
            'Readings saved from the Sacred Library',
            renderChevron(),
            () => navigation.navigate('Saved'),
          )}
        </View>

        {/* Notification & Reminders */}
        {renderSectionHeader('Notification & Reminders')}
        <View style={s.sectionCard}>
          {renderSettingRow(
            'Mantra Reminders',
            'Get reminded to complete your daily chanting',
            renderChevron(),
            () => setRemindersSheetOpen(true),
          )}
          {/* <View style={styles.separator} />
          {renderSettingRow(
            'Streak Reminder',
            'Daily reminder at 9:00 PM to maintain your streak',
            <Switch
              value={streakReminder}
              onValueChange={setStreakReminder}
              trackColor={{false: Colors.surfaceLight, true: Colors.primary}}
              thumbColor={Colors.primaryTextColor}
            />,
          )} */}
        </View>

        {/* Preferences */}
        {renderSectionHeader('Preferences')}
        <View style={s.sectionCard}>
          {renderSettingRow(
            isDark ? 'Light Mode' : 'Dark Mode',
            'Switch between dark and light theme',
            <Switch
              value={isDark}
              onValueChange={setTheme}
              trackColor={{false: colors.surfaceLight, true: colors.primary}}
              thumbColor={colors.primaryTextColor}
            />,
          )}
          {/* <View style={s.separator} />
          {renderSettingRow(
            'App Haptics',
            'Enable vibration feedback on button taps',
            <Switch
              value={haptics}
              onValueChange={setHaptics}
              trackColor={{false: colors.surfaceLight, true: colors.primary}}
              thumbColor={colors.primaryTextColor}
            />,
          )} */}
        </View>

        {/* Backup & Restore */}
        {/* {renderSectionHeader('Backup & Restore')}
        <View style={s.sectionCard}>
          {renderSettingRow(
            'Backup & Restore',
            'Save your chanting data to device storage',
            renderChevron(),
            handleBackup,
          )} */}
          {/* <View style={s.separator} />
          {renderSettingRow(
            'Restore',
            'Restore previously saved chanting data',
            renderChevron(),
            handleRestore,
          )} */}
        {/* </View> */}

        {/* Support & Feedback */}
        {renderSectionHeader('Support & Feedback')}
        <View style={s.sectionCard}>
          {renderSettingRow(
            'Write Your Feedback',
            'Help us improve Japam108',
            renderChevron(),
            handleFeedback,
          )}
          <View style={s.separator} />
          {renderSettingRow(
            'Invite Friends',
            'Share this app with your loved ones',
            renderChevron(),
            handleInvite,
          )}
          <View style={s.separator} />
          {renderSettingRow(
            'Support',
            'Get help and contact our team',
            renderChevron(),
            handleSupport,
          )}
        </View>

        {/* About & Legal */}
        {renderSectionHeader('About & Legal')}
        <View style={s.sectionCard}>
          {/* {renderSettingRow(
            `About ${appName}`,
            'Version and a short description of the app',
            renderChevron(),
            () => navigation.navigate('About'),
          )} */}
          {helps.map(help => (
            <React.Fragment key={help.id}>
              <View style={s.separator} />
              {renderSettingRow(
                help.title,
                undefined,
                renderChevron(),
                () => navigation.navigate('Help', {helpId: help.id, title: help.title}),
              )}
            </React.Fragment>
          ))}
          {helpsError ? (
            <>
              <View style={s.separator} />
              <View style={s.settingRow}>
                <CustomText variant="caption" color={colors.error}>
                  {helpsError}
                </CustomText>
              </View>
            </>
          ) : null}
        </View>

        {/* Account */}
        {renderSectionHeader('Account')}
        <View style={s.sectionCard}>
          {renderSettingRow(
            user?.name || 'Signed in',
            user?.email,
            renderChevron(),
            openEditProfileModal,
          )}
          <View style={s.separator} />
          {renderSettingRow(
            'Change Password',
            'Update your account password',
            renderChevron(),
            () => setChangePasswordSheetOpen(true),
          )}
          <View style={s.separator} />
          {renderSettingRow(
            'Log out',
            'Sign out of your account',
            <CustomText variant="body" color={colors.error}>
              Log out
            </CustomText>,
            openLogoutModal,
          )}
          <View style={s.separator} />
          {renderSettingRow(
            'Delete Account',
            'Permanently delete your account and all data',
            <CustomText variant="body" color={colors.error}>
              Delete Account
            </CustomText>,
            openDeleteAccountModal,
          )}
        </View>
      </ScrollView>
      <AddLogSheet
        visible={addLogSheetOpen}
        date={logDate}
        onSelectDate={setLogDate}
        onClose={() => setAddLogSheetOpen(false)}
        onAddLog={handleAddLog}
      />
      <CalendarSheet
        visible={calendarOpen}
        month={calendarMonth}
        selected={calendarSelected}
        resetConfirm={calendarResetConfirm}
        onClose={() => setCalendarOpen(false)}
        onShift={shiftCalendar}
        onSelectDay={selectCalendarDay}
        onReset={handleResetCount}
      />
      <NaamJapRemindersSheet
        visible={remindersSheetOpen}
        onClose={() => setRemindersSheetOpen(false)}
      />
      <InviteFriendsSheet
        visible={inviteSheetOpen}
        onClose={() => setInviteSheetOpen(false)}
      />
      <ConfirmModal
        visible={logoutModalVisible}
        title="Log out"
        message="You will need to sign in again to use the app."
        confirmText="Log out"
        onConfirm={handleLogoutConfirm}
        onCancel={closeLogoutModal}
      />
      <ConfirmModal
        visible={deleteAccountModalVisible}
        title="Delete Account"
        message="This will permanently delete your account and all your data. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteAccountConfirm}
        onCancel={closeDeleteAccountModal}
      />
      <ConfirmModal
        visible={logoutModalVisible}
        title="Log out"
        message="You will need to sign in again to use the app."
        confirmText="Log out"
        onConfirm={handleLogoutConfirm}
        onCancel={closeLogoutModal}
      />
      <ConfirmModal
        visible={deleteAccountModalVisible}
        title="Delete Account"
        message="This will permanently delete your account and all your data. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteAccountConfirm}
        onCancel={closeDeleteAccountModal}
      />
      <EditProfileModal
        visible={editProfileModalVisible}
        onClose={closeEditProfileModal}
        onSave={handleEditProfileSubmit}
        loading={editProfileLoading}
        initialData={user}
        errors={editProfileErrors}
        onFieldChange={setEditProfileForm}
        formData={editProfileForm}
      />
      <ChangePasswordSheet
        visible={changePasswordSheetOpen}
        onClose={() => setChangePasswordSheetOpen(false)}
        onSuccess={() => showToast('Password changed successfully', 'success')}
      />
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
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    title: {
      fontFamily: Fonts.bold,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    sectionHeader: {
      marginTop: 28,
      marginBottom: 12,
    },
    sectionTitle: {
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    settingTextContainer: {
      flex: 1,
      marginRight: 12,
    },
    settingLabel: {
      fontFamily: Fonts.medium,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: 16,
    },
  });

export default SettingsScreen;