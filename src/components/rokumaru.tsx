import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export type RokumaruMood = 'guide' | 'happy' | 'encourage';

const rokumarus = {
  guide: require('../../assets/learn/rokumaru-guide.png'),
  happy: require('../../assets/learn/rokumaru-happy.png'),
  encourage: require('../../assets/learn/rokumaru-encourage.png'),
} as const;

const labels: Record<RokumaruMood, string> = {
  guide: '学びを案内する禄丸',
  happy: '良い判断を喜ぶ禄丸',
  encourage: '次の判断を励ます禄丸',
};

export function Rokumaru({
  mood = 'guide',
  style,
  testID,
}: {
  mood?: RokumaruMood;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View
      accessibilityLabel={labels[mood]}
      testID={testID ?? `rokumaru-${mood}`}
      style={style}
    >
      <Image
        source={rokumarus[mood]}
        resizeMode="contain"
        accessibilityElementsHidden
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
  },
});
