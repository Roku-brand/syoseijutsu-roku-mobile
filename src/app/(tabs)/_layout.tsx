import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { colors, fonts } from '@/constants/theme';

const tabIcons: Record<string, string> = {
  index: '禄',
  discover: '探',
  catalog: '系',
  'my-os': '私',
};

export default function TabsLayout() {
  return (
    <Tabs
      detachInactiveScreens
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.goldLight,
        tabBarInactiveTintColor: '#9A9C95',
        tabBarStyle: styles.hiddenTabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarHideOnKeyboard: true,
        lazy: true,
        freezeOnBlur: true,
        tabBarIcon: ({ color, focused }) => (
          <Text
            style={[
              styles.tabIcon,
              { color, opacity: focused ? 1 : 0.75 },
            ]}
          >
            {tabIcons[route.name] ?? '·'}
          </Text>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'メイン' }} />
      <Tabs.Screen name="discover" options={{ title: '探す' }} />
      <Tabs.Screen name="catalog" options={{ title: '体系', href: null }} />
      <Tabs.Screen name="my-os" options={{ title: 'マイOS' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  hiddenTabBar: { display: 'none' },
  tabItem: { paddingVertical: 1 },
  tabLabel: { fontFamily: fonts.sans, fontSize: 10, fontWeight: '600' },
  tabIcon: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
});
