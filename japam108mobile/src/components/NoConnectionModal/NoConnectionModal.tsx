import React from 'react';
import {View, StyleSheet, Modal, TouchableOpacity} from 'react-native';
import CustomText from '../CustomText/CustomText';
import {useTheme} from '../../context/ThemeContext';
import {Fonts} from '../../theme/fonts';

interface NoConnectionModalProps {
  visible: boolean;
  /** Reason shown in the modal, e.g. "Cannot reach the server at ...". */
  message: string;
  onClose: () => void;
  onRetry: () => void;
  retrying?: boolean;
}

const NoConnectionModal: React.FC<NoConnectionModalProps> = ({
  visible,
  message,
  onClose,
  onRetry,
  retrying = false,
}) => {
  const {colors} = useTheme();
  const s = styles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalContainer}>
          <CustomText variant="subheading" style={s.modalTitle}>
            No Connection
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
              onPress={onClose}
              activeOpacity={0.7}>
              <CustomText variant="body" color={colors.secondaryTextColor}>
                Close
              </CustomText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modalButton, s.retryButton, retrying && s.retryButtonDisabled]}
              onPress={onRetry}
              activeOpacity={0.7}
              disabled={retrying}>
              <CustomText variant="body" color={colors.primaryTextColor}>
                {retrying ? 'Retrying...' : 'Retry'}
              </CustomText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = (colors: import('../../theme/colors').ThemeColors) =>
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

export default NoConnectionModal;
