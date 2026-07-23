import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';
import { BrandMark } from './ui';

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <BrandMark />
      <ActivityIndicator color={colors.gold} style={styles.indicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: { marginTop: 32 },
});
