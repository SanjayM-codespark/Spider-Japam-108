import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import InlineIcon from '../InlineIcon/InlineIcon';
import CustomText from '../CustomText/CustomText';
import {useTheme} from '../../context/ThemeContext';

type Props = {
  /** Shown next to the back arrow, e.g. the category or content name. */
  title: string;
  onBack: () => void;
};

/**
 * The `← Name` bar at the top of the category and content screens.
 *
 * The app hides the native header everywhere, so each screen draws its own.
 */
const LibraryHeader: React.FC<Props> = ({title, onBack}) => {
  const {colors} = useTheme();

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onBack}
        style={styles.back}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back">
        <InlineIcon name="chevronLeft" size={20} color={colors.primaryTextColor} />
      </Pressable>
      <CustomText
        variant="subheading"
        color={colors.primaryTextColor}
        numberOfLines={1}
        style={styles.title}>
        {title}
      </CustomText>
    </View>
  );
};

// Nothing here is themed: the bar sits on the screen background and the arrow
// and title take their colour from CustomText and InlineIcon.
const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  back: {
    padding: 4,
  },
  title: {
    flex: 1,
  },
});

export default LibraryHeader;
