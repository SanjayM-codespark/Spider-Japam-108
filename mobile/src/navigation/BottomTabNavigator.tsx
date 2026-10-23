import React from 'react';
import {StyleSheet} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MaterialDesignIcons} from '@react-native-vector-icons/material-design-icons/static';
import {useTheme} from '../context/ThemeContext';
import {Fonts} from '../theme/fonts';

import CounterScreen from '../screens/CounterScreen/CounterScreen';
import ReportScreen from '../screens/ReportScreen/ReportScreen';
import SacredLibraryScreen from '../screens/SacredLibraryScreen/SacredLibraryScreen';
import SettingsScreen from '../screens/SettingsScreen/SettingsScreen';

const Tab = createBottomTabNavigator();

type IconName = React.ComponentProps<typeof MaterialDesignIcons>['name'];

type TabIconProps = {
  focused: boolean;
  color: string;
  size: number;
  active: IconName;
  inactive: IconName;
};

const TabIcon = ({focused, color, size, active, inactive}: TabIconProps) => (
  <MaterialDesignIcons
    name={focused ? active : inactive}
    size={size}
    color={color}
  />
);

const renderCounterIcon = ({focused, color, size}: Omit<TabIconProps, 'active' | 'inactive'>) => (
  <TabIcon focused={focused} color={color} size={size} active="om" inactive="om" />
);

const renderReportIcon = ({focused, color, size}: Omit<TabIconProps, 'active' | 'inactive'>) => (
  <TabIcon
    focused={focused}
    color={color}
    size={size}
    active="chart-box"
    inactive="chart-box-outline"
  />
);

const renderLibraryIcon = ({focused, color, size}: Omit<TabIconProps, 'active' | 'inactive'>) => (
  <TabIcon
    focused={focused}
    color={color}
    size={size}
    active="book-open-page-variant"
    inactive="book-open-page-variant-outline"
  />
);

const renderSettingsIcon = ({focused, color, size}: Omit<TabIconProps, 'active' | 'inactive'>) => (
  <TabIcon focused={focused} color={color} size={size} active="cog" inactive="cog-outline" />
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
          tabBarIcon: renderCounterIcon,
        }}
      />
      <Tab.Screen
        name="Report"
        component={ReportScreen}
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: renderReportIcon,
        }}
      />
      <Tab.Screen
        name="Library"
        component={SacredLibraryScreen}
        options={{
          tabBarLabel: 'Sacred Library',
          tabBarIcon: renderLibraryIcon,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: renderSettingsIcon,
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
});

export default BottomTabNavigator;
