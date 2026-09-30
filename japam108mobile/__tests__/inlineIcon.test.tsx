/**
 * Guards the settings and counter menu arrows. They used to be a literal ">"
 * character, and the counter rows used the stroked chevronRight, which reads as
 * a back arrow rather than a list affordance. Both now use the Material
 * keyboard_arrow_right glyph, which is filled.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import Svg, {Path} from 'react-native-svg';
import InlineIcon from '../src/components/InlineIcon/InlineIcon';

// The Material Design keyboard_arrow_right path.
const MATERIAL_ARROW = 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z';

let tree: ReactTestRenderer.ReactTestRenderer;

const render = (name: Parameters<typeof InlineIcon>[0]['name'], props = {}) => {
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<InlineIcon name={name} {...props} />);
  });
  return tree;
};

afterEach(() => {
  ReactTestRenderer.act(() => {
    tree.unmount();
  });
});

describe('InlineIcon keyboardArrowRight', () => {
  it('draws the Material keyboard_arrow_right path', () => {
    const path = render('keyboardArrowRight').root.findByType(Path);

    expect(path.props.d).toBe(MATERIAL_ARROW);
  });

  it('is filled, so it does not read as a back arrow', () => {
    const path = render('keyboardArrowRight').root.findByType(Path);

    // chevronRight is a stroked outline; this one is a solid triangle.
    expect(path.props.fill).toBe('currentColor');
    expect(path.props.stroke).toBeUndefined();
  });

  it('is a different glyph from the stroked chevronRight', () => {
    const arrow = render('keyboardArrowRight').root.findByType(Path);
    const chevron = render('chevronRight').root.findByType(Path);

    expect(arrow.props.d).not.toBe(chevron.props.d);
  });

  it('honours the size and colour it is given', () => {
    const renderer = render('keyboardArrowRight', {size: 22, color: '#B0B0B0'});
    const svg = renderer.root.findByType(Svg);

    expect(svg.props.width).toBe(22);
    expect(svg.props.height).toBe(22);
    expect(svg.props.color).toBe('#B0B0B0');
  });
});
