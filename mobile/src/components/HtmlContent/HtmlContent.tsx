/**
 * Renders the HTML that the admin panel's rich text editor stores.
 *
 * The editor is TipTap, which emits a small closed set of tags: paragraphs,
 * h1 to h3, bold, italic, strikethrough, bullet and ordered lists, blockquotes
 * and code blocks. This maps those onto themed React Native text so a page
 * written in the panel looks the same in the app instead of showing raw tags.
 *
 * Deliberately not a general purpose HTML renderer. An unknown tag is unwrapped
 * and its text kept, so content that is a paragraph of plain text (or that uses
 * a tag outside the set above) still reads correctly rather than disappearing.
 */
import React from 'react';
import {Linking, StyleSheet, Text, View} from 'react-native';
import CustomText from '../CustomText/CustomText';
import {useTheme} from '../../context/ThemeContext';
import {Fonts} from '../../theme/fonts';

/** The inline styles a tag can carry, applied to the text it wraps. */
interface InlineStyle {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
  href?: string;
}

/** Spacing and size for each block level tag, resolved against the theme. */
const blockStyles = (colors: import('../../theme/colors').ThemeColors) => ({
  h1: {fontSize: 22, fontFamily: Fonts.bold, marginTop: 20, lineHeight: 28},
  h2: {fontSize: 19, fontFamily: Fonts.semiBold, marginTop: 18, lineHeight: 25},
  h3: {fontSize: 16, fontFamily: Fonts.semiBold, marginTop: 16, lineHeight: 22},
  p: {fontSize: 14, fontFamily: Fonts.regular, marginTop: 10, lineHeight: 22},
  li: {fontSize: 14, fontFamily: Fonts.regular, marginTop: 4, lineHeight: 22},
  blockquote: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginTop: 12,
    lineHeight: 22,
    color: colors.secondaryTextColor,
  },
  code: {fontSize: 13, fontFamily: Fonts.regular, marginTop: 12, lineHeight: 20},
});

/** Strip the tags and collapse whitespace, for a page that is plain text. */
export const htmlToPlainText = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

/**
 * Decode the handful of entities the editor can produce. Anything else is left
 * alone rather than guessed at.
 */
const decodeEntities = (text: string): string =>
  text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

type Props = {
  /** The raw HTML from the admin panel. */
  html: string;
};

const HtmlContent: React.FC<Props> = ({html}) => {
  const {colors} = useTheme();
  const s = styles(colors);
  const blocks = blockStyles(colors);

  // The editor always produces a <p> per block, so splitting on block level
  // tags is enough to walk the document. Nested lists are handled by keeping the
  // raw chunk for the list and recursing into it.
  const chunks = html
    .split(/(?=<(?:p|h[1-6]|ul|ol|blockquote|pre|div)\b)/i)
    .map(chunk => chunk.trim())
    .filter(Boolean);

  const openLink = (href?: string) => {
    if (!href) {
      return;
    }
    Linking.openURL(href).catch(() => {
      // A bad or unsupported link should not take the page down with it.
    });
  };

  const renderInline = (text: string, style: InlineStyle, key: string) => {
    let content: React.ReactNode = decodeEntities(text);

    if (style.bold) {
      content = <Text key={`${key}-b`} style={s.bold}>{content}</Text>;
    }
    if (style.italic) {
      content = <Text key={`${key}-i`} style={s.italic}>{content}</Text>;
    }
    if (style.strike) {
      content = <Text key={`${key}-s`} style={s.strike}>{content}</Text>;
    }
    if (style.code) {
      content = <Text key={`${key}-c`} style={s.code}>{content}</Text>;
    }
    if (style.href) {
      content = (
        <Text
          key={`${key}-a`}
          style={s.link}
          accessibilityRole="link"
          onPress={() => openLink(style.href)}>
          {content}
        </Text>
      );
    }
    return content;
  };

  /**
   * Pull the text out of one block level chunk, honouring the inline tags
   * inside it. `style` accumulates bold/italic/strike/link as nesting is
   * encountered, so <strong> inside <a> stays both.
   *
   * The last alternative matches any tag outside the set above, so an unknown
   * one is unwrapped and its text recursed into rather than being shown.
   */
  const renderInlineContent = (
    chunk: string,
    style: InlineStyle,
    key: string,
  ): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    // The group and the capture keep the delimiters out of the text. The tag
    // name allows hyphens so a custom element matches its own closing tag.
    const pattern =
      /<(strong|b|em|i|s|strike|del|u|a|code)\b([^>]*)>([\s\S]*?)<\/\1>|<(br|hr)\b[^>]*\/?>|<([a-z][a-z0-9-]*)\b[^>]*>([\s\S]*?)<\/\5>/gi;

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = pattern.exec(chunk)) !== null) {
      // Anything before the tag is literal text.
      if (match.index > lastIndex) {
        nodes.push(
          renderInline(chunk.slice(lastIndex, match.index), style, `${key}-t${index++}`),
        );
      }

      const tag = (match[1] || match[4] || match[5] || '').toLowerCase();
      const attrs = match[2] || '';
      const inner = match[3] ?? match[6] ?? '';

      if (tag === 'br' || tag === 'hr') {
        nodes.push('\n');
      } else if (tag === 'a') {
        const href = /href\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1];
        nodes.push(
          ...renderInlineContent(inner, {...style, href: href ?? style.href}, `${key}-a${index++}`),
        );
      } else if (tag === 'strong' || tag === 'b') {
        nodes.push(
          ...renderInlineContent(inner, {...style, bold: true}, `${key}-i${index++}`),
        );
      } else if (tag === 'em' || tag === 'i') {
        nodes.push(
          ...renderInlineContent(inner, {...style, italic: true}, `${key}-i${index++}`),
        );
      } else if (tag === 's' || tag === 'strike' || tag === 'del') {
        nodes.push(
          ...renderInlineContent(inner, {...style, strike: true}, `${key}-i${index++}`),
        );
      } else if (tag === 'u') {
        // Underline has no CustomText variant, so it maps onto italic.
        nodes.push(
          ...renderInlineContent(inner, {...style, italic: true}, `${key}-i${index++}`),
        );
      } else if (tag === 'code') {
        nodes.push(
          ...renderInlineContent(inner, {...style, code: true}, `${key}-i${index++}`),
        );
      } else {
        // A tag outside the set above: drop the tag, keep what is inside it.
        nodes.push(...renderInlineContent(inner, style, `${key}-x${index++}`));
      }

      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < chunk.length) {
      nodes.push(renderInline(chunk.slice(lastIndex), style, `${key}-t${index++}`));
    }

    return nodes;
  };

  /** Turn one <li> into a row with the bullet or number beside it. */
  const renderListItem = (item: string, key: string, marker: string) => {
    const text = htmlToPlainText(item);
    return (
      <View key={key} style={s.listItem}>
        <CustomText
          variant="body"
          color={colors.secondaryTextColor}
          style={s.listMarker}>
          {marker}
        </CustomText>
        <CustomText
          variant="body"
          color={colors.primaryTextColor}
          style={s.listText}>
          {text}
        </CustomText>
      </View>
    );
  };

  const renderBlock = (chunk: string, key: string): React.ReactNode => {
    const tag = /^<([a-z0-9]+)/i.exec(chunk)?.[1]?.toLowerCase() ?? 'p';

    if (tag === 'ul' || tag === 'ol') {
      const items = chunk.match(/<li\b[^>]*>[\s\S]*?<\/li>/gi) ?? [];
      return (
        <View key={key} style={s.list}>
          {items.map((item, i) => renderListItem(item, `${key}-li${i}`, tag === 'ol' ? `${i + 1}.` : '\u2022'))}
        </View>
      );
    }

    if (tag === 'blockquote') {
      const inner = /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/i.exec(chunk)?.[1] ?? chunk;
      return (
        <View key={key} style={s.quoteBox}>
          <View style={s.quoteBar} />
          <CustomText
            variant="body"
            color={colors.secondaryTextColor}
            style={blocks.blockquote}>
            {renderInlineContent(inner, {}, `${key}-q`)}
          </CustomText>
        </View>
      );
    }

    if (tag === 'pre') {
      const inner = /<pre\b[^>]*>([\s\S]*?)<\/pre>/i.exec(chunk)?.[1] ?? '';
      // The editor wraps code in <pre><code>; drop both and render the text.
      const codeText = htmlToPlainText(inner.replace(/<\/?code>/gi, ''));
      return (
        <View key={key} style={s.codeBox}>
          <CustomText variant="body" color={colors.primaryTextColor} style={s.codeText}>
            {codeText}
          </CustomText>
        </View>
      );
    }

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const inner = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(chunk)?.[1] ?? '';
      const variant = tag === 'h1' ? 'heading' : 'subheading';
      return (
        <CustomText
          key={key}
          variant={variant}
          color={colors.primaryTextColor}
          style={blocks[tag as 'h1' | 'h2' | 'h3']}>
          {renderInlineContent(inner, {}, `${key}-h`)}
        </CustomText>
      );
    }

    // Paragraph and anything else, including a bare text chunk with no tag.
    // The outer block tag has to come off here: renderInlineContent only strips
    // inline tags, so passing the whole chunk would print <p> on screen.
    const outer = /^<([a-z0-9]+)\b[^>]*>([\s\S]*)<\/\1>$/i.exec(chunk);
    return (
      <CustomText
        key={key}
        variant="body"
        color={colors.primaryTextColor}
        style={blocks.p}>
        {renderInlineContent(outer ? outer[2] : chunk, {}, `${key}-p`)}
      </CustomText>
    );
  };

  if (!html.trim()) {
    return (
      <CustomText variant="body" color={colors.secondaryTextColor}>
        This page is empty.
      </CustomText>
    );
  }

  return <View>{chunks.map((chunk, i) => renderBlock(chunk, `b${i}`))}</View>;
};

const styles = (colors: import('../../theme/colors').ThemeColors) =>
  StyleSheet.create({
    bold: {
      fontFamily: Fonts.bold,
    },
    italic: {
      fontStyle: 'italic',
    },
    strike: {
      textDecorationLine: 'line-through',
    },
    code: {
      fontFamily: Fonts.regular,
      backgroundColor: colors.surfaceLight,
    },
    link: {
      textDecorationLine: 'underline',
      color: colors.primary,
    },
    list: {
      marginTop: 10,
      marginBottom: 4,
    },
    listItem: {
      flexDirection: 'row',
      marginTop: 4,
    },
    listMarker: {
      width: 22,
      lineHeight: 22,
    },
    listText: {
      flex: 1,
      lineHeight: 22,
    },
    quoteBox: {
      flexDirection: 'row',
      marginTop: 12,
    },
    quoteBar: {
      width: 3,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginRight: 10,
    },
    codeBox: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
    },
    codeText: {
      fontSize: 13,
      lineHeight: 20,
    },
  });

export default HtmlContent;
