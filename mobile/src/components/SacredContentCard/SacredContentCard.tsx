import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import CustomText from '../CustomText/CustomText';
import InlineIcon from '../InlineIcon/InlineIcon';
import {useTheme} from '../../context/ThemeContext';
import {LibraryContent} from '../../services/library';

type Props = {
  content: LibraryContent;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
};

/** Trims a possibly missing field so it never renders as a blank line. */
const line = (value: string | null | undefined): string => (value ?? '').trim();

/**
 * One published entry as a card: title, deity, short description and a heart.
 *
 * The heart sits in its own Pressable so saving an entry does not also open it.
 */
const SacredContentCard: React.FC<Props> = ({
  content,
  isFavorite,
  onPress,
  onToggleFavorite,
}) => {
  const {colors} = useTheme();
  const s = styles(colors);
  const deity = line(content.deity);
  const description = line(content.short_description);

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [s.card, pressed && s.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={content.title}>
      <View style={s.body}>
        <CustomText variant="subheading" color={colors.primaryTextColor} numberOfLines={1}>
          {content.title}
        </CustomText>
        {deity ? (
          <CustomText
            variant="caption"
            color={colors.secondaryTextColor}
            numberOfLines={1}
            style={s.meta}>
            {deity}
          </CustomText>
        ) : null}
        {description ? (
          <CustomText variant="body" color={colors.secondaryTextColor} numberOfLines={2}>
            {description}
          </CustomText>
        ) : null}
      </View>

      <Pressable
        onPress={onToggleFavorite}
        hitSlop={12}
        style={s.heart}
        accessibilityRole="button"
        accessibilityLabel={isFavorite ? 'Remove from saved' : 'Save this reading'}>
        <InlineIcon
          name={isFavorite ? 'heart' : 'heartOutline'}
          size={20}
          color={isFavorite ? colors.error : colors.secondaryTextColor}
        />
      </Pressable>
    </Pressable>
  );
};

const styles = (colors: import('../../theme/colors').ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginHorizontal: 16,
      marginBottom: 12,
    },
    cardPressed: {
      opacity: 0.7,
    },
    body: {
      flex: 1,
      gap: 2,
    },
    meta: {
      marginBottom: 2,
    },
    heart: {
      padding: 4,
    },
  });

export default SacredContentCard;
