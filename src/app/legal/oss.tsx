import { FlatList, StyleSheet, View } from 'react-native';
import { AppText, Screen } from '@/components/ui';
import notices from '@/data/generated/third-party-notices.json';

export default function ThirdPartyNotices() {
  return <Screen scroll={false}>
    <AppText variant="title">オープンソースの通知</AppText>
    <AppText style={styles.lead}>処世術禄で使用するソフトウェアのライセンス・著作権表示です。開発・ビルド用の依存も含みます。各権利者の条件が適用されます。</AppText>
    <FlatList data={notices} keyExtractor={item => `${item.name}@${item.version}`} renderItem={({item}) => <View style={styles.item}>
      <AppText style={styles.name}>{item.name} {item.version}</AppText>
      <AppText selectable>{item.license}</AppText>
      {item.notices.map((notice,index) => <AppText key={index} selectable style={styles.notice}>{notice}</AppText>)}
    </View>} />
  </Screen>;
}
const styles=StyleSheet.create({lead:{marginVertical:18},item:{paddingVertical:20,borderBottomWidth:1,borderBottomColor:'#DDD4C4'},name:{fontSize:17,fontWeight:'700'},notice:{fontSize:12,lineHeight:18,marginTop:10}});
