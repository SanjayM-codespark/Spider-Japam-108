import React from 'react';
import {StyleSheet, TextInput, View} from 'react-native';
import InlineIcon from '../InlineIcon/InlineIcon';
import {useTheme} from '../../context/ThemeContext';
import {Fonts} from '../../theme/fonts';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
};

/**
 * The rounded search field used on the library and category screens.
 *
 * Built here rather than reusing CustomInput because that one pins the light
 * palette, so it would not follow the dark theme.
 */
const LibrarySearchBar: React.FC<Props> = ({value, onChangeText, placeholder}) => {
  const {colors} = useTheme();
  const s = styles(colors);

  return (
    <View style={s.wrap}>
      <InlineIcon name="search" size={17} color={colors.secondaryTextColor} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.secondaryTextColor}
        style={s.input}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel={placeholder}
      />
    </View>
  );
};

const styles = (colors: import('../../theme/colors').ThemeColors) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      marginHorizontal: 16,
      marginBottom: 16,
    },
    input: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 14,
      fontFamily: Fonts.regular,
      color: colors.primaryTextColor,
    },
  });

export default LibrarySearchBar;
