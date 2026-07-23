import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { AppText, DetailHeader, EmptyState, Screen, SectionHeader } from '@/components/ui';

const documents = {
  about: {
    title: '処世術禄について',
    lead: '人生・仕事・人間関係の迷いを、再現可能な判断原則へ変える。',
    sections: [
      {
        title: '目的',
        paragraphs: [
          '処世術禄は、心理学・行動科学・社会科学・経験則から、現実の場面で使える判断の選択肢を整理したアプリです。',
          '一つの正解を押しつけるのではなく、状況を見直し、自分で納得して決めるための視点を提供します。',
        ],
      },
      {
        title: '五つの原則',
        paragraphs: [
          '処世術は、語るものではなく使うもの。',
          '処世術は万能ではなく、状況に依存する。',
          '処世術は人格の代替ではなく、人格を守る道具。',
          '処世術は知識ではなく、実践して初めて術になる。',
          '処世術は目的ではなく、目的に従う手段。',
        ],
      },
      {
        title: '免責',
        paragraphs: [
          '本アプリは一般的な情報提供を目的としており、医療・法律・金融その他の専門的助言を提供するものではありません。重要な判断では、必要に応じて資格を持つ専門家へご相談ください。',
        ],
      },
    ],
  },
  privacy: {
    title: 'プライバシーポリシー',
    lead: '処世術禄は、個人データを外部へ送信しません。',
    sections: [
      {
        title: '取得する情報',
        paragraphs: [
          '本アプリは、氏名、メールアドレス、位置情報、広告識別子その他、ユーザーを直接識別する情報を取得しません。',
          'アカウント登録、広告配信、アクセス解析、行動追跡は行いません。',
        ],
      },
      {
        title: '端末内に保存する情報',
        paragraphs: [
          '保存した処世術、コレクション、カードへのメモ、関心カテゴリ、閲覧履歴、初回設定の完了状態を端末内に保存します。',
          'これらの情報は本アプリの機能提供だけに使用され、運営者のサーバーや第三者へ送信されません。',
        ],
      },
      {
        title: '削除',
        paragraphs: [
          '設定画面の「個人データをすべて消去」から、端末内に保存された個人設定を削除できます。アプリを削除した場合も、原則として端末内データは削除されます。',
        ],
      },
      {
        title: '外部リンク',
        paragraphs: [
          '本アプリから外部Webサイトを開いた場合、そのサイトのプライバシーポリシーが適用されます。',
        ],
      },
      {
        title: '改定',
        paragraphs: [
          '機能追加や法令変更に応じて本ポリシーを改定する場合があります。重要な変更はアプリ内または公式サイトで告知します。',
          '制定日：2026年7月23日',
        ],
      },
    ],
  },
  terms: {
    title: '利用規約',
    lead: '処世術禄を安全に利用するための基本条件です。',
    sections: [
      {
        title: '適用',
        paragraphs: [
          '本規約は、禄ブランドが提供する「処世術禄」アプリの利用条件を定めます。ユーザーは本規約に同意したうえで本アプリを利用するものとします。',
        ],
      },
      {
        title: '利用上の注意',
        paragraphs: [
          '本アプリの内容は、特定の行動や結果を保証するものではありません。情報の適用は、個々の状況、安全、法令、第三者の権利を考慮し、ユーザー自身の責任で判断してください。',
          '本アプリを、違法行為、他者への嫌がらせ、操作、差別、権利侵害に利用してはなりません。',
        ],
      },
      {
        title: '知的財産',
        paragraphs: [
          '本アプリに含まれる文章、構成、デザイン、商標その他のコンテンツに関する権利は、運営者または正当な権利者に帰属します。私的利用の範囲を超えた無断転載・再配布を禁止します。',
        ],
      },
      {
        title: 'サービス変更',
        paragraphs: [
          '運営者は、品質向上、保守、法令対応等のため、本アプリの内容を変更、停止または終了する場合があります。',
        ],
      },
      {
        title: '免責',
        paragraphs: [
          '運営者は、故意または重過失がある場合を除き、本アプリの利用により生じた損害について、法令で認められる範囲で責任を負いません。',
          '制定日：2026年7月23日',
        ],
      },
    ],
  },
} as const;

export default function LegalDocumentScreen() {
  const { document } = useLocalSearchParams<{
    document: keyof typeof documents;
  }>();
  const content = documents[document];

  if (!content) {
    return (
      <Screen>
        <DetailHeader />
        <EmptyState
          title="文書が見つかりません"
          description="前の画面へ戻ってください。"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <DetailHeader title={content.title} />
      <AppText variant="title">{content.title}</AppText>
      <AppText style={{ marginTop: 16, opacity: 0.68 }}>{content.lead}</AppText>
      {content.sections.map((section) => (
        <View key={section.title}>
          <SectionHeader title={section.title} />
          {section.paragraphs.map((paragraph) => (
            <AppText key={paragraph} style={{ marginBottom: 14 }}>
              {paragraph}
            </AppText>
          ))}
        </View>
      ))}
    </Screen>
  );
}
