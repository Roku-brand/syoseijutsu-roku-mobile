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
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.goldLight,
        tabBarInactiveTintColor: '#9A9C95',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarHideOnKeyboard: true,
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
      <Tabs.Screen name="catalog" options={{ title: '体系' }} />
      <Tabs.Screen name="my-os" options={{ title: 'マイOS' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 78,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: colors.ink,
    borderTopColor: '#3B3E37',
  },
  tabItem: { paddingVertical: 1 },
  tabLabel: { fontFamily: fonts.sans, fontSize: 10, fontWeight: '600' },
  tabIcon: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
});
