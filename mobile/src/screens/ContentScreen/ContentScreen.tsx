import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import CustomText from '../../components/CustomText/CustomText';
import InlineIcon from '../../components/InlineIcon/InlineIcon';
import LibraryHeader from '../../components/LibraryHeader/LibraryHeader';
import {useTheme} from '../../context/ThemeContext';
import {assetUrl} from '../../config/apiConfig';
import {getFavoriteContentIds, toggleFavoriteContent} from '../../database/database';
import {errorMessage} from '../../services/api';
import {LibraryContent, contentInitial, fetchLibraryContent} from '../../services/library';
import {Fonts} from '../../theme/fonts';
import {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Content'>;

const text = (value: string | null | undefined): string => (value ?? '').trim();

/**
 * The line height of a script line, shared by the number gutter and the words
 * beside it. Both have to agree or the numbers sit between the lines rather than
 * on their baseline.
 */
const SCRIPT_LINE_HEIGHT = 24;

/** One line of the script, split into its number and the words after it. */
interface ScriptLine {
  /** The leading number as typed, or null for a line that is not numbered. */
  number: string | null;
  text: string;
}

/** A leading "1." or "12)" and the rest of the line. */
const NUMBERED_LINE = /^(\d{1,4})\s*[.)\-:]+\s+(.+)$/;

/**
 * Most of these entries are a namavali or a numbered list, one mantra a line,
 * typed into a textarea in the admin panel. Left as one string they are a
 * single Text node, which cannot hold the numbers in a column: a line long
 * enough to wrap sends its continuation back to the left edge and the numbers
 * end up in a ragged stagger. Splitting here lets each line get a row and a
 * fixed gutter.
 *
 * A short entry is left alone. A one line mantra is meant to be centred under
 * the image, not numbered, and treating it as a list would add a gutter and
 * left align a line that was written to sit in the middle of the screen.
 */
const parseScriptLines = (value: string): ScriptLine[] => {
  const lines = value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const numbered = lines.filter(line => NUMBERED_LINE.test(line)).length;

  // Two numbered lines is the signal, not a ratio against the rest. A ratio
  // looked tidier on paper but a namavali opened by a long introduction would
  // fall under it and quietly go back to being one centred blob, which is the
  // thing this exists to avoid. A line the admin did not number is kept as a
  // full width line instead, so a heading above the list survives.
  if (lines.length < 2 || numbered < 2) {
    return lines.map(line => ({number: null, text: line}));
  }

  return lines.map(line => {
    const match = NUMBERED_LINE.exec(line);
    return match ? {number: match[1], text: match[2].trim()} : {number: null, text: line};
  });
};

/**
 * The meaning is typed into a textarea, so one pasted from a page arrives with a
 * newline at every line break of the source and an indent on the continuation
 * lines. Kept as sent, those break a single sentence into a ragged stubby block
 * that reflows badly at phone width. Blank lines are left alone, because those
 * do separate real paragraphs, and an admin who meant one wants to see one.
 */
const parseMeaning = (value: string): string[] =>
  value
    .split(/\n\s*\n/)
    .map(paragraph =>
      paragraph
        .split(/\r?\n/)
        .map(line => line.trim())
        .join(' '),
    )
    .map(paragraph => paragraph.replace(/\s{2,}/g, ' ').trim())
    .filter(Boolean);

/**
 * One reading: the script on top, the transliterated title, the meaning, a Save
 * button and a shortcut into the counter.
 *
 * There is deliberately no Listen button. The backend has no audio for content
 * yet, so the control would have nothing to play.
 */
const ContentScreen: React.FC<Props> = ({navigation, route}) => {
  const {contentId} = route.params;
  const {colors} = useTheme();
  const s = styles(colors);

  const [content, setContent] = useState<LibraryContent | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [entry, favorites] = await Promise.all([
          fetchLibraryContent(contentId),
          getFavoriteContentIds(),
        ]);
        if (!active) {
          return;
        }
        setContent(entry);
        setIsFavorite(favorites.includes(entry.id));
      } catch (err) {
        if (active) {
          setError(errorMessage(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [contentId]);

  const onToggleFavorite = useCallback(async () => {
    if (!content) {
      return;
    }
    try {
      const saved = await toggleFavoriteContent(content.id, content.title);
      setIsFavorite(saved);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [content]);

  /**
   * A reading is pushed on the root stack, above the tab navigator, so
   * 'Counter' is not a route this screen can reach by name and
   * navigate('Counter') is silently dropped.
   *
   * The tab navigator is registered on the stack as 'Home'. plain navigate is
   * not enough: it only reuses a route already on the stack when the params
   * match, and 'Home' was registered with none, so it would push a second copy
   * of the tabs and leave the reading buried underneath. popTo returns to the
   * existing one and passes the tab along with it.
   *
   * The reading travels with it because the counter counts a naam, not a
   * reading, and has no way to fetch this one: the screen has already loaded it
   * and the name, script and bead count are needed to build that naam.
   */
  const onStartNaamJap = useCallback(() => {
    if (!content) {
      return;
    }
    const beads = content.bead_count ?? 0;
    navigation.popTo('Home', {
      screen: 'Counter',
      params: {
        prefill: {
          contentId: content.id,
          // A reading with no title still needs something to label the mala.
          name: text(content.title) || text(content.deity) || 'Mantra',
          // The script, not the transliteration or the meaning: this is the
          // text the counter shows while the beads are being counted.
          mantra: text(content.content),
          // A reading with no bead count of its own still needs a target, and
          // 108 is what the counter already falls back to.
          beadCount: beads > 0 ? beads : 108,
        },
      },
    });
  }, [content, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <LibraryHeader title="Reading" onBack={navigation.goBack} />
        <ActivityIndicator size="large" color={colors.primary} style={s.spinner} />
      </SafeAreaView>
    );
  }

  if (!content) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <LibraryHeader title="Reading" onBack={navigation.goBack} />
        <CustomText variant="body" color={colors.error} style={s.error}>
          {error || 'This reading could not be opened.'}
        </CustomText>
      </SafeAreaView>
    );
  }

  const body = text(content.content);
  const meaning = text(content.meaning);
  const image = assetUrl(content.category_image_url);
  const scriptLines = parseScriptLines(body);
  const meaningParagraphs = parseMeaning(meaning);
  // The centred block below is for a mantra written to sit in the middle of the
  // screen, which is the wrong shape for a numbered list.
  const isScriptList = scriptLines.some(line => line.number !== null);

  return (
    // 'bottom' is needed now that a bar is pinned to the foot of the screen,
    // otherwise the button sits under the home indicator and the nav bar.
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <LibraryHeader title={content.title} onBack={navigation.goBack} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {image ? (
          <Image source={{uri: image}} style={s.hero} resizeMode="cover" />
        ) : (
          <CustomText variant="heading" color={colors.secondaryTextColor} style={s.mark}>
            {contentInitial(content)}
          </CustomText>
        )}

        {/* No fontFamily here on purpose: the script may not be covered by the
            bundled fonts, and letting the system pick avoids empty glyphs. */}
        {isScriptList ? (
          <View style={s.scriptList}>
            {scriptLines.map((line, index) => (
              <View key={`script-${index}`} style={s.scriptRow}>
                {line.number ? (
                  <CustomText
                    variant="body"
                    color={colors.secondaryTextColor}
                    style={s.scriptNumber}>
                    {line.number}
                  </CustomText>
                ) : null}
                <CustomText
                  variant="body"
                  color={colors.primaryTextColor}
                  style={s.scriptText}>
                  {line.text}
                </CustomText>
              </View>
            ))}
          </View>
        ) : (
          <CustomText variant="heading" color={colors.primaryTextColor} style={s.body}>
            {body}
          </CustomText>
        )}

        {text(content.deity) ? (
          <>
            <View style={s.divider} />
            <View style={s.deityBlock}>
              <CustomText variant="subheading" color={colors.primaryTextColor}>
                Deity
              </CustomText>
              <CustomText variant="body" color={colors.secondaryTextColor}>
                {text(content.deity)}
              </CustomText>
            </View>
          </>
        ) : null}

        {meaning ? (
          <>
            <View style={s.divider} />
            <View style={s.meaningBlock}>
              <CustomText variant="subheading" color={colors.primaryTextColor}>
                Meaning
              </CustomText>
              {meaningParagraphs.map((paragraph, index) => (
                <CustomText
                  key={`meaning-${index}`}
                  variant="body"
                  color={colors.secondaryTextColor}
                  style={s.meaning}>
                  {paragraph}
                </CustomText>
              ))}
            </View>
          </>
        ) : null}

        {text(content.source) ? (
          <>
            <View style={s.divider} />
            <CustomText variant="caption" color={colors.secondaryTextColor} style={s.source}>
              Source: {text(content.source)}
            </CustomText>
          </>
        ) : null}
      </ScrollView>

      {/*
        Both actions are pinned to the foot of the screen rather than left at
        the end of the reading, where a long entry put them below the fold with
        no sign they existed. Kept out of the ScrollView, and side by side so
        the bar stays one line tall.
      */}
      <View style={s.footer}>
        {error ? (
          <CustomText variant="caption" color={colors.error} style={s.footerError}>
            {error}
          </CustomText>
        ) : null}

        <View style={s.footerActions}>
          <Pressable
            onPress={onToggleFavorite}
            style={({pressed}) => [s.save, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Remove from saved' : 'Save this reading'}>
            <InlineIcon
              name={isFavorite ? 'heart' : 'heartOutline'}
              size={20}
              color={isFavorite ? colors.error : colors.primaryTextColor}
            />
            <CustomText variant="subheading" color={colors.primaryTextColor}>
              {isFavorite ? 'Saved' : 'Save'}
            </CustomText>
          </Pressable>

          {content.category_name === 'Mantras' && (
            <Pressable
              onPress={onStartNaamJap}
              style={({pressed}) => [s.primary, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Start Counting">
              <InlineIcon name="play" size={18} color={colors.background} />
              <CustomText variant="subheading" color={colors.background} numberOfLines={1} style={s.startText}>
                Start Counting
              </CustomText>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = (colors: import('../../theme/colors').ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    mark: {
      textAlign: 'center',
      marginVertical: 8,
    },
    hero: {
      width: '100%',
      height: 140,
      borderRadius: 12,
      marginVertical: 8,
    },
    body: {
      textAlign: 'left',
      marginTop: 8,
      lineHeight: 34,
    },
    /**
     * A numbered script is a row per line rather than one block of text, so the
     * numbers hold a column and a line that wraps hangs under its own words
     * instead of jumping back to the left edge.
     */
    scriptList: {
      marginTop: 12,
    },
    scriptRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 6,
    },
    // Wide enough for three digits, the largest a mala of 10008 reaches, and
    // right aligned so the separators up against the words line up.
    scriptNumber: {
      width: 32,
      marginRight: 10,
      fontFamily: Fonts.bold,
      fontSize: 14,
      lineHeight: SCRIPT_LINE_HEIGHT,
      textAlign: 'right',
    },
    scriptText: {
      flex: 1,
      // Body sized rather than a heading: a namavali is a hundred lines, and at
      // heading size it fills the screen before the meaning is in sight.
      fontFamily: Fonts.bold,
      fontSize: 17,
      lineHeight: SCRIPT_LINE_HEIGHT,
    },
    meaningBlock: {
      marginTop: 12,
      gap: 8,
    },
    deityBlock: {
      marginTop: 12,
      gap: 8,
    },
    meaning: {
      lineHeight: 21,
    },
    // One line per section (Deity, Meaning, Source), so a long reading keeps
    // its structure as it scrolls instead of the labels running together.
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginTop: 24,
    },
    source: {
      marginTop: 12,
    },
    /**
     * Sits outside the ScrollView, so it stays at the foot of the screen. The
     * border and background keep a long entry from running straight into the
     * buttons as it scrolls past.
     */
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      // A device with no home indicator reports a zero bottom inset, which
      // would otherwise leave the buttons flush against the screen edge.
      paddingBottom: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    footerError: {
      marginBottom: 8,
    },
    // The two actions share one line and one size, so neither reads as the
    // more important one purely by being wider.
    footerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    save: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    primary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    pressed: {
      opacity: 0.7,
    },
    startText: {
      fontSize: 16,
    },
    empty: {
      marginHorizontal: 16,
      marginTop: 12,
    },
    // Used by the "could not be opened" state, which has no footer.
    error: {
      marginHorizontal: 16,
      marginTop: 12,
    },
    spinner: {
      marginTop: 32,
    },
  });

export default ContentScreen;
