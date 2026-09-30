import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import CustomText from '../../components/CustomText/CustomText';
import {useTheme} from '../../context/ThemeContext';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({onFinish}) => {
  const {colors} = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, onFinish]);

  const s = styles(colors);

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.container}>
        <Animated.View
          style={[
            s.logoContainer,
            {opacity: fadeAnim, transform: [{scale: scaleAnim}]},
          ]}>
          <View style={s.logoCircle}>
            <CustomText variant="heading" color={colors.primary}>
              ॐ
            </CustomText>
          </View>
        </Animated.View>

        <Animated.View style={{opacity: fadeAnim}}>
          <CustomText variant="heading" style={s.title}>
            Japam108
          </CustomText>
          <CustomText
            variant="body"
            color={colors.secondaryTextColor}
            style={s.subtitle}>
            Count your mantras with devotion
          </CustomText>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = (colors: import('../../theme/colors').ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      gap: 24,
    },
    logoContainer: {
      marginBottom: 16,
    },
    logoCircle: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: colors.surfaceLight,
      borderWidth: 2,
      borderColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      textAlign: 'center',
    },
    subtitle: {
      textAlign: 'center',
      marginTop: 8,
    },
  });

export default SplashScreen;