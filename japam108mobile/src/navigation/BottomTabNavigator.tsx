import React from 'react';
import {View, StyleSheet} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../context/ThemeContext';
import {Fonts} from '../theme/fonts';

import CounterScreen from '../screens/CounterScreen/CounterScreen';
import ReportScreen from '../screens/ReportScreen/ReportScreen';
import SacredLibraryScreen from '../screens/SacredLibraryScreen/SacredLibraryScreen';
import SettingsScreen from '../screens/SettingsScreen/SettingsScreen';
import InlineIcon from '../components/InlineIcon/InlineIcon';

const Tab = createBottomTabNavigator();

const CounterIcon = ({color, size}: {color: string; size: number}) => (
  <View style={[styles.iconContainer, {width: size, height: size}]}>
    <View style={[styles.crosshairOuter, {borderColor: color, width: size, height: size}]}>
      <View style={[styles.crosshairInner, {backgroundColor: color}]} />
    </View>
  </View>
);

const ReportIcon = ({color, size}: {color: string; size: number}) => (
  <View style={[styles.iconContainer, {width: size, height: size}]}>
    <View style={styles.barChart}>
      <View style={[styles.bar, {backgroundColor: color, height: size * 0.3}]} />
      <View style={[styles.bar, {backgroundColor: color, height: size * 0.6}]} />
      <View style={[styles.bar, {backgroundColor: color, height: size * 0.45}]} />
      <View style={[styles.bar, {backgroundColor: color, height: size * 0.8}]} />
    </View>
  </View>
);

const LibraryIcon = ({color, size}: {color: string; size: number}) => (
  <View style={[styles.iconContainer, {width: size, height: size}]}>
    <View style={[styles.book, {borderColor: color, height: size * 0.7}]}>
      <View style={[styles.bookLine, {backgroundColor: color}]} />
      <View style={[styles.bookLine, {backgroundColor: color, width: '60%'}]} />
      <View style={[styles.bookLine, {backgroundColor: color, width: '80%'}]} />
    </View>
  </View>
);

const SettingsIcon = ({color, size}: {color: string; size: number}) => (
  <InlineIcon name="settings" color={color} size={size} />
);

const BottomTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondaryTextColor,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: styles.tabBarLabel,
      }}>
      <Tab.Screen
        name="Counter"
        component={CounterScreen}
        options={{
          tabBarLabel: 'Counter',
          tabBarIcon: ({color, size}) => <CounterIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Report"
        component={ReportScreen}
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: ({color, size}) => <ReportIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Library"
        component={SacredLibraryScreen}
        options={{
          tabBarLabel: 'Sacred Library',
          tabBarIcon: ({color, size}) => <LibraryIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({color, size}) => <SettingsIcon color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarLabel: {
    fontFamily: Fonts.medium,
    fontSize: 9,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairOuter: {
    borderWidth: 2,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  bar: {
    width: 5,
    borderRadius: 2,
  },
  book: {
    borderWidth: 2,
    borderRadius: 4,
    width: '65%',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 3,
  },
  bookLine: {
    height: 2,
    width: '100%',
    borderRadius: 1,
  },
});

export default BottomTabNavigator;
