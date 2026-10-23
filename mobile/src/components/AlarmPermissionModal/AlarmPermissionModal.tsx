import React from 'react';
import {View, StyleSheet, Modal, TouchableOpacity} from 'react-native';
import CustomText from '../CustomText/CustomText';
import {useTheme} from '../../context/ThemeContext';
import {Fonts} from '../../theme/fonts';
import {ThemeColors} from '../../theme/colors';

interface AlarmPermissionModalProps {
  visible: boolean;
  onSkip: () => void;
  onOpenSettings: () => void;
  loading?: boolean;
}

const AlarmPermissionModal: React.FC<AlarmPermissionModalProps> = ({
  visible,
  onSkip,
  onOpenSettings,
  loading = false,
}) => {
  const {colors} = useTheme();
  const s = styles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onSkip}>
      <View style={s.modalOverlay}>
        <View style={s.modalContainer}>
          <CustomText variant='subheading' style={s.modalTitle}>
            Enable alarm delivery
          </CustomText>
          <CustomText
            variant='body'
            color={colors.secondaryTextColor}
            style={s.modalMessage}>
            Phone battery saver can delay reminders unless 'Alarms & reminders' is allowed for Japam108. Turn it on in the settings that open next.
          </CustomText>
          <View style={s.modalActions}>
            <TouchableOpacity
              style={[s.modalButton, s.cancelButton]}
              onPress={onSkip}
              activeOpacity={0.7}
              disabled={loading}>
              <CustomText variant='body' color={colors.secondaryTextColor}>
                Skip for now
              </CustomText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modalButton, s.retryButton, loading && s.retryButtonDisabled]}
              onPress={onOpenSettings}
              activeOpacity={0.7}
              disabled={loading}>
              <CustomText variant='body' color={colors.background}>
                {loading ? 'Opening...' : 'Open Settings'}
              </CustomText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = (colors: ThemeColors) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    modalContainer: {
      width: '100%',
      backgroundColor: colors.background,
      borderRadius: 20,
      padding: 24,
    },
    modalTitle: {
      fontFamily: Fonts.bold,
    },
    modalMessage: {
      marginTop: 12,
      lineHeight: 22,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.surfaceLight,
    },
    retryButton: {
      backgroundColor: colors.primary,
    },
    retryButtonDisabled: {
      opacity: 0.6,
    },
  });

export default AlarmPermissionModal;

