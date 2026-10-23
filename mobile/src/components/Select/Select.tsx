import React from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  Text,
  ScrollView,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {useTheme} from '../../context/ThemeContext';
import type {ThemeColors} from '../../theme/colors';
import CustomText from '../CustomText/CustomText';
import InlineIcon from '../InlineIcon/InlineIcon';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  label,
  disabled = false,
  error,
}) => {
  const {colors} = useTheme();
  const [showModal, setShowModal] = React.useState(false);
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <View>
      <TouchableOpacity
        onPress={() => !disabled && setShowModal(true)}
        disabled={disabled}
        style={[styles.selectButton, disabled && styles.selectButtonDisabled, error && styles.selectButtonError]}
        accessibilityRole="button"
        accessibilityLabel={label}>
        <View style={styles.selectButtonContent}>
          <CustomText
            variant="body"
            color={value ? colors.primaryTextColor : colors.secondaryTextColor}
            style={styles.selectButtonText}>
            {selectedOption?.label || placeholder}
          </CustomText>
          <InlineIcon
            name="chevronDown"
            size={16}
            color={colors.secondaryTextColor}
          />
        </View>
      </TouchableOpacity>

      {error && (
        <CustomText variant="caption" color={colors.error} style={styles.errorText}>
          {error}
        </CustomText>
      )}

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowModal(false)} />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <CustomText variant="subheading" style={styles.modalTitle}>
                {label || 'Select'}
              </CustomText>
              <Pressable onPress={() => setShowModal(false)} hitSlop={10}>
                <InlineIcon name="close" size={24} color={colors.secondaryTextColor} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalListContent}>
              {options.map(option => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    setShowModal(false);
                  }}
                  style={styles.modalItem}>
                  <View style={styles.modalItemContent}>
                    <CustomText
                      variant="body"
                      color={option.value === value ? colors.primary : colors.primaryTextColor}
                      style={option.value === value ? styles.modalItemActive : {}}>
                      {option.label}
                    </CustomText>
                    {option.value === value && (
                      <InlineIcon name="check" size={16} color={colors.primary} />
                    )}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create<{
    selectButton: ViewStyle;
    selectButtonContent: ViewStyle;
    selectButtonText: TextStyle;
    selectButtonDisabled: ViewStyle;
    selectButtonError: ViewStyle;
    errorText: TextStyle;
    modalOverlay: ViewStyle;
    modalContainer: ViewStyle;
    modalHeader: ViewStyle;
    modalTitle: TextStyle;
    modalList: ViewStyle;
    modalListContent: ViewStyle;
    modalItem: ViewStyle;
    modalItemContent: ViewStyle;
    modalItemActive: TextStyle;
  }>({
    selectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    selectButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    selectButtonText: {
      flex: 1,
    },
    selectButtonDisabled: {
      opacity: 0.6,
    },
    selectButtonError: {
      borderColor: colors.error,
    },
    errorText: {
      marginTop: 6,
      marginBottom: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    modalContainer: {
      width: '100%',
      backgroundColor: colors.background,
      borderRadius: 20,
      padding: 20,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontFamily: 'Montserrat-Bold',
    },
    modalList: {
      maxHeight: 300,
    },
    modalListContent: {
      paddingBottom: 20,
    },
    modalItem: {
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalItemContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalItemActive: {
      fontFamily: 'Montserrat-SemiBold',
    },
  });

export default Select;