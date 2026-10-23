import React from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
} from 'react-native';
import CustomText from '../CustomText/CustomText';
import {Colors} from '../../theme/colors';

interface CustomInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

const CustomInput: React.FC<CustomInputProps> = ({
  label,
  error,
  style,
  ...props
}) => {
  return (
    <View style={styles.container}>
      {label && (
        <CustomText variant="caption" color={Colors.secondaryTextColor}>
          {label}
        </CustomText>
      )}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={Colors.secondaryTextColor}
        {...props}
      />
      {error && (
        <CustomText variant="caption" color={Colors.error}>
          {error}
        </CustomText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.primaryTextColor,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 6,
  },
  inputError: {
    borderColor: Colors.error,
  },
});

export default CustomInput;
