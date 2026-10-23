import React from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  Pressable,
} from 'react-native';
import CustomText from '../CustomText/CustomText';
import InlineIcon from '../InlineIcon/InlineIcon';
import {useTheme} from '../../context/ThemeContext';
import {Fonts} from '../../theme/fonts';

interface FormFieldProps extends TextInputProps {
  label: string;
  /** Marks the field red and prints the message underneath when set. */
  error?: string;
  /** Optional control rendered at the right edge, e.g. a password reveal. */
  trailing?: React.ReactNode;
  /** Optional control rendered at the left edge, e.g. a country code picker. */
  leading?: React.ReactNode;
}

/**
 * A labelled text field in the themed palette.
 *
 * Built here rather than reusing CustomInput because that one pins the light
 * colours, so it would not follow the dark theme (same reason as
 * LibrarySearchBar).
 */
const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  trailing,
  leading,
  style,
  ...props
}) => {
  const {colors} = useTheme();
  const s = styles(colors);

  return (
    <View style={s.wrap}>
      <CustomText variant="caption" color={colors.secondaryTextColor} style={s.label}>
        {label}
      </CustomText>
      <View style={[s.inputRow, error ? s.inputRowError : null]}>
        {leading ? <View style={s.leading}>{leading}</View> : null}
        <TextInput
          placeholderTextColor={colors.secondaryTextColor}
          style={[s.input, style]}
          {...props}
        />
        {trailing ? <View style={s.trailing}>{trailing}</View> : null}
      </View>
      {error ? (
        <CustomText variant="caption" color={colors.error} style={s.error}>
          {error}
        </CustomText>
      ) : null}
    </View>
  );
};

/**
 * The eye toggle used beside a password field. Kept with FormField so the two
 * auth screens share one implementation.
 */
export const PasswordToggle: React.FC<{visible: boolean; onPress: () => void}> = ({
  visible,
  onPress,
}) => {
  const {colors} = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Hide password' : 'Show password'}>
      <InlineIcon
        name={visible ? 'eyeOff' : 'eye'}
        size={18}
        color={colors.secondaryTextColor}
      />
    </Pressable>
  );
};

const styles = (colors: import('../../theme/colors').ThemeColors) =>
  StyleSheet.create({
    wrap: {
      marginBottom: 16,
    },
    label: {
      marginBottom: 6,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
    },
    inputRowError: {
      borderColor: colors.error,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 15,
      fontFamily: Fonts.regular,
      color: colors.primaryTextColor,
    },
   leading: {
  paddingRight: 12,
  marginRight: 12,
  borderRightWidth: 1,
  borderRightColor: colors.border,
  justifyContent: 'center',
  alignSelf: 'stretch',   // divider spans the full field height
},
    trailing: {
      paddingLeft: 10,
    },
    error: {
      marginTop: 6,
    },
  });

export default FormField;
