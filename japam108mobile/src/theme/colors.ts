export interface ThemeColors {
  primary: string;
  secondary: string;
  primaryTextColor: string;
  secondaryTextColor: string;
  background: string;
  surface: string;
  surfaceLight: string;
  border: string;
  success: string;
  error: string;
  warning: string;
}

export const darkColors: ThemeColors = {
  primary: '#FF6B00',
  secondary: '#1A1A2E',
  primaryTextColor: '#FFFFFF',
  secondaryTextColor: '#B0B0B0',
  background: '#0F0F23',
  surface: '#1A1A2E',
  surfaceLight: '#252542',
  border: '#2A2A4A',
  success: '#4CAF50',
  error: '#FF5252',
  warning: '#FFB74D',
};

export const lightColors: ThemeColors = {
  primary: '#FF6B00',
  secondary: '#F0F0F5',
  primaryTextColor: '#1A1A2E',
  secondaryTextColor: '#6B6B8D',
  background: '#FFFFFF',
  surface: '#F0F0F5',
  surfaceLight: '#E8E8F0',
  border: '#DDDDE5',
  success: '#4CAF50',
  error: '#FF5252',
  warning: '#FFB74D',
};

export const Colors = lightColors;
