import React from 'react';
import {TouchableOpacity, StyleSheet, ViewStyle} from 'react-native';
import HapticFeedback from 'react-native-haptic-feedback';
import CustomText from '../CustomText/CustomText';
import {Colors} from '../../theme/colors';

interface ResetButtonProps {
  onPress: () => void;
  style?: ViewStyle;
}

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: true,
};

const ResetButton: React.FC<ResetButtonProps> = ({onPress, style}) => {
  const handlePress = () => {
    HapticFeedback.trigger('notificationWarning', hapticOptions);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      activeOpacity={0.8}>
      <CustomText variant="body" color={Colors.error}>
        Reset
      </CustomText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderWidth: 1,
    borderColor: Colors.error,
  },
});

export default ResetButton;
