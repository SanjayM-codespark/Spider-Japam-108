import React, {ReactNode} from 'react';
import {TouchableOpacity, StyleSheet, ViewStyle} from 'react-native';
import HapticFeedback from 'react-native-haptic-feedback';
import ProgressRing from '../ProgressRing/ProgressRing';
import {playTapSound} from '../../services/sound';
import {Colors} from '../../theme/colors';

interface CounterButtonProps {
  onPress: () => void;
  size?: number;
  strokeWidth?: number;
  style?: ViewStyle;
  progress?: number;
  progressColor?: string;
  trackColor?: string;
  children?: ReactNode;
}

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: true,
};

const CounterButton: React.FC<CounterButtonProps> = ({
  onPress,
  size = 200,
  strokeWidth = 8,
  style,
  progress = 0,
  progressColor = Colors.primaryTextColor,
  trackColor = Colors.border,
  children,
}) => {
  const handlePress = () => {
    HapticFeedback.trigger('impactMedium', hapticOptions);
    playTapSound();
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.button, {width: size, height: size, borderRadius: size / 2}, style]}
      onPress={handlePress}
      activeOpacity={0.85}>
      <ProgressRing
        size={size}
        strokeWidth={strokeWidth}
        progress={progress}
        trackColor={trackColor}
        progressColor={progressColor}>
        {children}
      </ProgressRing>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CounterButton;