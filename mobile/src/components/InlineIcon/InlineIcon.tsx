import React from 'react';
import {ViewStyle, StyleProp} from 'react-native';
import Svg, {Path, G, Circle, Rect} from 'react-native-svg';

export type InlineIconName =
  | 'flame'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronUp'
  | 'chevronDown'
  | 'check'
  | 'dots'
  | 'close'
  | 'play'
  | 'pause'
  | 'stop'
  | 'eye'
  | 'eyeOff'
  | 'calendar'
  | 'bead'
  | 'settings'
  | 'clock'
  | 'trash'
  | 'share'
  | 'link'
  | 'search'
  | 'heart'
  | 'heartOutline'
  | 'keyboardArrowRight'
  | 'plus'
  | 'edit';

const GLYPH_VIEWBOX = 24;

const GLYPHS: Record<InlineIconName, React.ReactNode> = {
  flame: (
    <Path
      fill="currentColor"
      d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"
    />
  ),
  chevronRight: (
    <Path
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 6l6 6-6 6"
    />
  ),
  // The Material Design "keyboard_arrow_right" glyph, kept as a path so the app
  // carries no icon font. It is a filled triangle rather than the stroked
  // chevron above, so it reads as a list affordance instead of a back arrow.
  keyboardArrowRight: (
    <Path
      fill="currentColor"
      d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"
    />
  ),
  // Material "add", used by the Naam Preferences add button.
  plus: (
    <Path
      fill="currentColor"
      d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
    />
  ),
  // Material "edit", a pencil. Preferred over the gear for editing one item,
  // since the gear reads as "app settings".
  edit: (
    <Path
      fill="currentColor"
      d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 000-1.41l-2.34-2.34a.996.996 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
    />
  ),
  chevronLeft: (
    <Path
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 6l-6 6 6 6"
    />
  ),
  chevronUp: (
    <Path
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 15l-6-6-6 6"
    />
  ),
  chevronDown: (
    <Path
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 9l6 6 6-6"
    />
  ),
  check: (
    <Path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth={2.5}
      d="M5 13l4 4L19 7"
    />
  ),
  dots: (
    <G fill="currentColor">
      <Circle cx={5} cy={12} r={2} />
      <Circle cx={12} cy={12} r={2} />
      <Circle cx={19} cy={12} r={2} />
    </G>
  ),
  close: (
    <Path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth={2.5}
      d="M6 6l12 12M18 6L6 18"
    />
  ),
  play: <Path fill="currentColor" d="M8 5v14l11-7z" />,
  pause: (
    <Path
      fill="currentColor"
      d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"
    />
  ),
  stop: <Path fill="currentColor" d="M6 6h12v12H6z" />,
  eye: (
    <G fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <Circle cx={12} cy={12} r={3} />
    </G>
  ),
  eyeOff: (
    <G fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <Circle cx={12} cy={12} r={3} />
      <Path d="M1 1l22 22" />
    </G>
  ),
  calendar: (
    <G fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={4} width={18} height={17} rx={2} />
      <Path d="M3 9h18M8 2.5V6M16 2.5V6" />
    </G>
  ),
  bead: (
    <Circle cx={12} cy={12} r={8} fill="currentColor" />
  ),
  settings: (
    <Path
      fill="currentColor"
      d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81a.48.48 0 0 0-.47-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
    />
  ),
  clock: (
    <Path
      fill="currentColor"
      d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13.3V7h1.5v5.3l4.5 2.7-.8 1.2z"
    />
  ),
  trash: (
    <Path
      fill="currentColor"
      d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
    />
  ),
  share: (
    <G fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={18} cy={5} r={3} />
      <Circle cx={6} cy={12} r={3} />
      <Circle cx={18} cy={19} r={3} />
      <Path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </G>
  ),
  link: (
    <G fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10 13a5 5 0 007.1 0l2.9-2.9a5 5 0 00-7.1-7.1L11 4.9" />
      <Path d="M14 11a5 5 0 00-7.1 0L4 13.9a5 5 0 007.1 7.1L13 19.1" />
    </G>
  ),
  search: (
    <G fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="10.5" cy="10.5" r="6.5" />
      <Path d="M15.4 15.4L21 21" />
    </G>
  ),
  // The outline is drawn, the fill is toggled by opacity, so a saved entry
  // reads as a solid heart and an unsaved one as a hollow heart.
  heart: (
    <Path
      fill="currentColor"
      d="M12 21s-7.5-4.7-9.6-9A5.4 5.4 0 0112 5.6 5.4 5.4 0 0121.6 12c-2.1 4.3-9.6 9-9.6 9z"
    />
  ),
  heartOutline: (
    <Path
      fill="currentColor"
      fillOpacity={0.18}
      stroke="currentColor"
      strokeWidth={1.8}
      d="M12 20.3s-6.9-4.3-8.8-8.3a4.8 4.8 0 018.8-2.4 4.8 4.8 0 018.8 2.4c-1.9 4-8.8 8.3-8.8 8.3z"
    />
  ),
};

type Props = {
  name: InlineIconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

const InlineIcon: React.FC<Props> = ({name, size = 20, color = '#1A1A2E', style}) => (
  <Svg
    width={size}
    height={size}
    viewBox={`0 0 ${GLYPH_VIEWBOX} ${GLYPH_VIEWBOX}`}
    color={color}
    style={style}>
    {GLYPHS[name]}
  </Svg>
);

export default InlineIcon;