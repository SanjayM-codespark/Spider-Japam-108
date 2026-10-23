import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import CustomText from '../CustomText/CustomText';
import FormField, {PasswordToggle} from '../FormField/FormField';
import {useTheme} from '../../context/ThemeContext';
import {useAuth} from '../../context/AuthContext';
import {Fonts} from '../../theme/fonts';
import {authFieldErrors} from '../../services/auth';

interface ChangePasswordSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ChangePasswordSheet: React.FC<ChangePasswordSheetProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const {changePassword} = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Clear the form whenever the sheet is reopened so a stale password is never
  // left behind.
  useEffect(() => {
    if (!visible) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      setErrors({});
      setLoading(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};

    if (!currentPassword) {
      nextErrors.currentPassword = 'Enter your current password.';
    }
    if (!newPassword) {
      nextErrors.newPassword = 'Enter a new password.';
    } else if (newPassword.length < 6) {
      nextErrors.newPassword = 'Password must be at least 6 characters.';
    } else if (newPassword === currentPassword) {
      nextErrors.newPassword = 'New password must be different from your current password.';
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Re-enter your new password.';
    } else if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      await changePassword({currentPassword, newPassword});
      onClose();
      onSuccess?.();
    } catch (err) {
      const fieldErrors = authFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      } else if (err instanceof Error) {
        setErrors({general: err.message});
      } else {
        setErrors({general: 'Failed to change password. Please try again.'});
      }
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={s.root}>
        <KeyboardAvoidingView behavior="padding" style={s.keyboardView}>
          <Pressable style={s.backdrop} onPress={onClose} />
          <View style={s.sheet}>
            <View style={s.header}>
              <CustomText variant="subheading" color={colors.primaryTextColor} style={s.title}>
                Change Password
              </CustomText>
              <TouchableOpacity
                style={s.closeButton}
                onPress={onClose}
                activeOpacity={0.7}>
                <CustomText variant="body" color={colors.secondaryTextColor}>
                  ✕
                </CustomText>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={s.scrollView}
              contentContainerStyle={s.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              <FormField
                label="Current Password"
                value={currentPassword}
                onChangeText={val => {
                  setCurrentPassword(val);
                  setErrors(prev => ({...prev, currentPassword: '', general: ''}));
                }}
                placeholder="Enter current password"
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.currentPassword}
                trailing={
                  <PasswordToggle
                    visible={showCurrent}
                    onPress={() => setShowCurrent(v => !v)}
                  />
                }
              />

              <FormField
                label="New Password"
                value={newPassword}
                onChangeText={val => {
                  setNewPassword(val);
                  setErrors(prev => ({...prev, newPassword: '', general: ''}));
                }}
                placeholder="Enter new password"
                secureTextEntry={!showNew}
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.newPassword}
                trailing={
                  <PasswordToggle
                    visible={showNew}
                    onPress={() => setShowNew(v => !v)}
                  />
                }
              />

              <FormField
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={val => {
                  setConfirmPassword(val);
                  setErrors(prev => ({...prev, confirmPassword: '', general: ''}));
                }}
                placeholder="Re-enter new password"
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.confirmPassword}
                trailing={
                  <PasswordToggle
                    visible={showConfirm}
                    onPress={() => setShowConfirm(v => !v)}
                  />
                }
              />

              {errors.general ? (
                <CustomText variant="caption" color={colors.error} style={s.generalError}>
                  {errors.general}
                </CustomText>
              ) : null}
            </ScrollView>

            <View style={[s.buttonBar, {paddingBottom: insets.bottom + 12}]}>
              <TouchableOpacity
                style={[s.submitButton, loading && s.submitButtonDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.8}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <CustomText variant="subheading" color={colors.background}>
                    Change Password
                  </CustomText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = (colors: import('../../theme/colors').ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    backdrop: {
      flex: 1,
    },
    keyboardView: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontFamily: Fonts.bold,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    scrollContent: {
      paddingBottom: 12,
    },
    generalError: {
      marginTop: 4,
      marginBottom: 8,
    },
    buttonBar: {
      backgroundColor: colors.background,
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    submitButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
  });

export default ChangePasswordSheet;
