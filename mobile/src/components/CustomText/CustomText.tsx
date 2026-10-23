import React from 'react';
import {Text, TextProps, StyleSheet} from 'react-native';
import {Colors} from '../../theme/colors';
import {Fonts} from '../../theme/fonts';

interface CustomTextProps extends TextProps {
  variant?: 'heading' | 'subheading' | 'body' | 'caption' | 'counter';
  color?: string;
  children: React.ReactNode;
}

const CustomText: React.FC<CustomTextProps> = ({
  variant = 'body',
  color = Colors.primaryTextColor,
  style,
  children,
  ...props
}) => {
  return (
    <Text style={[styles[variant], {color}, style]} {...props}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  heading: {
    fontSize: 26,
    fontFamily: Fonts.bold,
  },
  subheading: {
    fontSize: 18,
    fontFamily: Fonts.semiBold,
  },
  body: {
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  caption: {
    fontSize: 10,
    fontFamily: Fonts.regular,
  },
  counter: {
    fontSize: 70,
    fontFamily: Fonts.extraBold,
  },
});

export default CustomText;
