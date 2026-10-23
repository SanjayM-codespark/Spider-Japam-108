/**
 * Guards the bug that made the About & Legal pages unreadable: the admin panel
 * stores rich text, and the app used to print that HTML as a plain string, so
 * the page showed its own <p> tags instead of the text.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from 'react-native';
import HtmlContent, {htmlToPlainText} from '../src/components/HtmlContent/HtmlContent';
import {ThemeProvider} from '../src/context/ThemeContext';

// HtmlContent only needs the theme for its colours, but ThemeContext reads the
// stored theme preference through SQLite on mount. Stubbed so this test does
// not open a database.
jest.mock('../src/database/database', () => ({
  getSetting: jest.fn(async () => null),
  setSetting: jest.fn(async () => undefined),
}));

let tree: ReactTestRenderer.ReactTestRenderer;

/**
 * Renders and waits for the theme load, so assertions never race the colours
 * ThemeContext sets after its first tick.
 */
const render = async (html: string) => {
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <HtmlContent html={html} />
      </ThemeProvider>,
    );
  });
  return tree;
};

/** Collects every string rendered anywhere in the tree. */
const allText = (node: unknown): string => {
  if (node === null || node === undefined) {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(allText).join('');
  }
  if (typeof node === 'object' && 'children' in node) {
    return allText((node as {children: unknown}).children);
  }
  return '';
};

afterEach(() => {
  ReactTestRenderer.act(() => {
    tree.unmount();
  });
});

describe('HtmlContent', () => {
  it('shows the text of a paragraph instead of its tags', async () => {
    // This is the exact content that was in the admin panel when the bug was
    // reported.
    const text = allText((await render('<p>privacy policy content</p>')).toJSON());

    expect(text).toContain('privacy policy content');
    expect(text).not.toContain('<p>');
    expect(text).not.toContain('</p>');
  });

  it('renders a heading and a paragraph as separate blocks', async () => {
    const text = allText(
      (await render('<h2>1. Information we collect</h2><p>We collect your name.</p>')).toJSON(),
    );

    expect(text).toContain('1. Information we collect');
    expect(text).toContain('We collect your name.');
  });

  it('renders bullet and numbered lists with a marker per item', async () => {
    const bullets = await render('<ul><li>First</li><li>Second</li></ul>');
    const bulletText = allText(bullets.toJSON());
    expect(bulletText).toContain('\u2022');
    expect(bulletText).toContain('Second');

    const numbered = await render('<ol><li>One</li><li>Two</li></ol>');
    const numberedText = allText(numbered.toJSON());
    expect(numberedText).toContain('1.');
    expect(numberedText).toContain('2.');
  });

  it('keeps the text of bold, italic and strikethrough runs', async () => {
    const text = allText(
      (await render('<p><strong>Never</strong> <em>sell</em> <s>share</s> data.</p>')).toJSON(),
    );

    expect(text).toContain('Never');
    expect(text).toContain('sell');
    expect(text).toContain('share');
    expect(text).not.toContain('<strong>');
  });

  it('renders a blockquote and a code block', async () => {
    expect(allText((await render('<blockquote>Quoted line</blockquote>')).toJSON())).toContain(
      'Quoted line',
    );
    expect(allText((await render('<pre><code>mantra = 108</code></pre>')).toJSON())).toContain(
      'mantra = 108',
    );
  });

  it('keeps the text of a tag it does not know instead of dropping it', async () => {
    const text = allText(
      (await render('<p>Before <custom-thing>inner</custom-thing> after</p>')).toJSON(),
    );

    expect(text).toContain('inner');
    expect(text).not.toContain('custom-thing');
  });

  it('reads plain text with no tags at all', async () => {
    expect(allText((await render('Just a sentence.')).toJSON())).toContain('Just a sentence.');
  });

  it('says so when the page is empty', async () => {
    expect(allText((await render('   ')).toJSON())).toContain('This page is empty.');
  });

  it('decodes the entities the editor can produce', async () => {
    const text = allText(
      (await render('<p>Terms &amp; conditions &lt;draft&gt; &quot;final&quot;</p>')).toJSON(),
    );

    expect(text).toContain('Terms & conditions <draft> "final"');
  });
});

describe('htmlToPlainText', () => {
  it('drops tags and turns block ends into line breaks', () => {
    expect(htmlToPlainText('<h2>Title</h2><p>One</p><p>Two</p>')).toBe('Title\nOne\nTwo');
  });

  it('turns a br into a line break', () => {
    expect(htmlToPlainText('a<br>b')).toBe('a\nb');
  });

  it('collapses runs of blank lines', () => {
    expect(htmlToPlainText('<p>a</p>\n\n\n<p>b</p>')).toBe('a\nb');
  });
});

describe('HtmlContent links', () => {
  it('marks a link so it is announced and tappable', async () => {
    const renderer = await render('<p><a href="https://example.com">Visit</a></p>');
    const link = renderer.root
      .findAllByType(Text)
      .find(node => String(node.props.children).includes('Visit'));

    expect(link).toBeDefined();
    expect(link!.props.accessibilityRole).toBe('link');
    expect(typeof link!.props.onPress).toBe('function');
  });
});
