import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import CustomText from '../CustomText/CustomText';
import {Colors} from '../../theme/colors';

interface CounterDisplayProps {
  count: number;
  target?: number;
  style?: ViewStyle;
}

const CounterDisplay: React.FC<CounterDisplayProps> = ({
  count,
  target,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <CustomText variant="counter" color={Colors.primaryTextColor}>
        {count}
      </CustomText>
      {target !== undefined && (
        <CustomText variant="subheading" color={Colors.secondaryTextColor}>
          / {target}
        </CustomText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CounterDisplay;
