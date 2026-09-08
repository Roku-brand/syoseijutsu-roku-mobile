import { Tabs } from 'expo-router';
import { Easing, Platform, StyleSheet, Text } from 'react-native';
import { colors, fonts } from '@/constants/theme';
import { motion } from '@/constants/motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const tabIcons: Record<string, string> = {
  index: '禄',
  discover: '探',
  learn: '学',
  'my-os': '私',
};

export default function TabsLayout() {
  const reducedMotion = useReducedMotion();
  return (
    <Tabs
      detachInactiveScreens
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: Platform.OS === 'web' || reducedMotion ? 'none' : 'fade',
        transitionSpec: { animation: 'timing', config: { duration: motion.tabDuration, easing: Easing.bezier(0.22, 1, 0.36, 1) } },
        sceneStyle: { backgroundColor: colors.paper },
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
      <Tabs.Screen name="learn" options={{ title: '学ぶ' }} />
      <Tabs.Screen name="my-os" options={{ title: 'マイページ' }} />
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
