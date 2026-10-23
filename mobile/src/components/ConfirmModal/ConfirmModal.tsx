import React from 'react';
import {View, StyleSheet, Modal, TouchableOpacity} from 'react-native';
import CustomText from '../CustomText/CustomText';
import {useTheme} from '../../context/ThemeContext';
import {Fonts} from '../../theme/fonts';
import {ThemeColors} from '../../theme/colors';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  loading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
  loading = false,
}) => {
  const {colors} = useTheme();
  const s = styles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={s.modalOverlay}>
        <View style={s.modalContainer}>
          <CustomText variant="subheading" style={s.modalTitle}>
            {title}
          </CustomText>
          <CustomText
            variant="body"
            color={colors.secondaryTextColor}
            style={s.modalMessage}>
            {message}
          </CustomText>
          <View style={s.modalActions}>
            <TouchableOpacity
              style={[s.modalButton, s.cancelButton]}
              onPress={onCancel}
              activeOpacity={0.7}
              disabled={loading}>
              <CustomText variant="body" color={colors.secondaryTextColor}>
                {cancelText}
              </CustomText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.modalButton,
                s.confirmButton,
                destructive && s.confirmButtonDestructive,
                loading && s.confirmButtonDisabled,
              ]}
              onPress={onConfirm}
              activeOpacity={0.7}
              disabled={loading}>
              <CustomText variant="body" color="#FFFFFF">
                {confirmText}
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
    confirmButton: {
      backgroundColor: colors.primary,
    },
    confirmButtonDestructive: {
      backgroundColor: colors.error,
    },
    confirmButtonDisabled: {
      opacity: 0.6,
    },
  });

export default ConfirmModal;