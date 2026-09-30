import React from 'react';
import {View, TouchableOpacity, StyleSheet, ViewStyle} from 'react-native';
import CustomText from '../CustomText/CustomText';
import {Colors} from '../../theme/colors';

interface TargetSelectorProps {
  targets: number[];
  selectedTarget: number | null;
  onSelect: (target: number | null) => void;
  style?: ViewStyle;
}

const TargetSelector: React.FC<TargetSelectorProps> = ({
  targets,
  selectedTarget,
  onSelect,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <CustomText
        variant="caption"
        color={Colors.secondaryTextColor}
        style={styles.label}>
        Select Target
      </CustomText>
      <View style={styles.options}>
        {targets.map(target => (
          <TouchableOpacity
            key={target}
            style={[
              styles.option,
              selectedTarget === target && styles.optionSelected,
            ]}
            onPress={() => onSelect(target)}>
            <CustomText
              variant="body"
              color={
                selectedTarget === target
                  ? Colors.primaryTextColor
                  : Colors.secondaryTextColor
              }>
              {target}
            </CustomText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    marginBottom: 8,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
});

export default TargetSelector;
