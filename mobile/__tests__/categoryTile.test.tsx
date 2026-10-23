/**
 * Guards the two things that were wrong with the category card: the picture
 * being cropped to an unreadable strip, and the name rendering at 10px.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Image, Text} from 'react-native';
import {CategoryTile} from '../src/screens/SacredLibraryScreen/SacredLibraryScreen';
import {LibraryCategory} from '../src/services/library';

const category: LibraryCategory = {
  id: 8,
  name: 'Namavalis',
  description: null,
  // The one real category has an empty icon, which is what makes the letter
  // fallback worth covering.
  icon: '',
  image_url: '/uploads/abc.png',
};

let tree: ReactTestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(element);
  });
  return tree;
};

afterEach(() => {
  ReactTestRenderer.act(() => {
    tree.unmount();
  });
});

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

/** Flattens a style prop, which StyleSheet and inline styles both allow. */
const flatten = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (acc, item) => ({...acc, ...flatten(item)}),
      {},
    );
  }
  return (style as Record<string, unknown>) ?? {};
};

const styleOfName = (renderer: ReactTestRenderer.ReactTestRenderer) => {
  const node = renderer.root
    .findAllByType(Text)
    .find(candidate => String(candidate.props.children).includes('Namavalis'));
  expect(node).toBeDefined();
  return flatten(node!.props.style);
};

describe('CategoryTile', () => {
  it('shows the category name at a readable size, not the 10px caption', () => {
    const style = styleOfName(render(<CategoryTile category={category} onPress={jest.fn()} />));

    expect(style.fontSize).toBe(15);
    expect(style.fontSize as number).toBeGreaterThan(10);
  });

  it('gives the picture a real height instead of a thin strip', () => {
    const renderer = render(<CategoryTile category={category} onPress={jest.fn()} />);
    const style = flatten(renderer.root.findByType(Image).props.style);

    // A two column tile is about 165px wide, so anything under half of that was
    // cropping the picture down to an unreadable band.
    expect(style.height as number).toBeGreaterThanOrEqual(80);
    expect(style.width).toBe('100%');
  });

  it('falls back to the first letter when the picture fails to load', () => {
    const renderer = render(<CategoryTile category={category} onPress={jest.fn()} />);

    // The server answers a missing file with an HTML error page, so onError is
    // the only signal the app gets.
    ReactTestRenderer.act(() => {
      renderer.root.findByType(Image).props.onError();
    });

    expect(renderer.root.findAllByType(Image)).toHaveLength(0);
    expect(allText(renderer.toJSON())).toContain('N');
  });

  it('uses the letter directly when the category has no picture at all', () => {
    const renderer = render(
      <CategoryTile category={{...category, image_url: null}} onPress={jest.fn()} />,
    );

    expect(renderer.root.findAllByType(Image)).toHaveLength(0);
    expect(allText(renderer.toJSON())).toContain('N');
  });

  it('prefers the category icon over the first letter', () => {
    const renderer = render(
      <CategoryTile category={{...category, image_url: null, icon: '📿'}} onPress={jest.fn()} />,
    );

    expect(allText(renderer.toJSON())).toContain('📿');
  });
});
