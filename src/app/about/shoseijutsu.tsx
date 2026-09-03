import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Screen } from '@/components/ui';
import { SeoBreadcrumbs } from '@/components/seo-breadcrumbs';
import { colors, fonts } from '@/constants/theme';

const chapters = [
  {
    title: '処世術とは',
    paragraphs: [
      '処世術とは、社会の中で人や状況とうまく関わりながら、自分の目的や生活を成り立たせていくための知恵や方法のことです。',
      '「処世」は世の中で暮らしていくこと、「術」はそのための方法や技術を意味します。',
      '一般には、人間関係の築き方、コミュニケーション、仕事での立ち回り、感情のコントロール、失敗への対処、適切な距離の取り方など、社会生活を円滑にする幅広い知恵を指します。',
      '処世術という言葉には、ときに「要領よく立ち回る」「世渡りをする」といった意味合いもあります。しかし、本来扱える範囲はそれだけではありません。',
    ],
    emphasis: ['相手を理解すること。', '自分を守ること。', '適切に主張すること。', '無用な争いを避けること。', '努力を成果につなげること。', '人生の選択をよりよくすること。'],
    closing: 'こうしたものも、広い意味では処世術です。',
  },
  {
    title: '処世術は「人を操る技術」ではない',
    paragraphs: [
      '処世術という言葉から、相手に取り入ったり、人を操作したりする技術を想像する人もいるかもしれません。',
      'しかし、それは処世術の一部を極端に捉えたものです。',
      '人間は一人では生きていません。自分の考えだけでなく、相手の感情、集団の力学、社会のルール、タイミング、環境など、多くの条件の中で生きています。',
      'それらを無視して「正しいことだけをしていればいい」と考えることも、現実的ではありません。',
    ],
    emphasis: ['現実を理解しながら、それでも自分がどう生きるかを選ぶ。'],
    closing: '処世術禄では、そのための技術を処世術と考えています。',
  },
  {
    title: 'なぜ処世術が必要なのか',
    paragraphs: [
      '学校では、数学や歴史は教えてくれます。',
      'しかし、',
      '「嫌われずに断るにはどうするか」 「人から軽く扱われないためにはどうするか」 「上司と意見が違うときどう伝えるか」 「失敗したあと、どう立て直すか」 「人間関係を終わらせるべきなのはいつか」',
      'といった問題には、ほとんど教科書がありません。',
      'ところが実際の人生では、こうした判断の積み重ねが、人間関係や仕事、生活の質を大きく左右します。',
      '多くの人は経験から少しずつ学びます。しかし、すべてを自分の失敗から学ぶ必要はありません。',
    ],
    emphasis: ['誰かが経験から得た知恵や、研究によって明らかになった人間の性質を、あらかじめ知ることができる。'],
    closing: 'そこに、処世術を学ぶ意味があります。',
  },
];

const pillars = [
  ['01', '網羅する', '処世術禄は、人間関係だけ、仕事だけといった一つの領域に限定しません。対人関係、仕事、人生という大きな領域をまたぎながら、日常で繰り返し直面する判断を幅広く扱います。一つの悩みだけを解決するのではなく、人生全体で使える知恵を一つの場所に集めることを目指しています。'],
  ['02', '体系にする', '知識は、数が多いだけでは使いやすくなりません。処世術禄では、散らばった知恵を「人物像」「処世術」「理論」という構造で整理します。「どういう人になりたいか」から探すこともできれば、具体的な処世術から探すこともできる。さらに、その背景にある理論までたどることができます。知識をただ並べるのではなく、互いの関係が分かる形にすることを重視しています。'],
  ['03', '理論につなぐ', '「こうするといい」と言われても、理由が分からなければ応用することは難しくなります。そこで処世術禄では、心理学、行動科学、社会科学などの理論と処世術を結びつけます。なぜその方法が効くのか。どんな場面で効きやすいのか。どこまで使えて、どこから使えないのか。背景を理解することで、処世術は単なるコツではなく、状況に応じて使い分けられる判断材料になります。'],
  ['04', '実践に落とす', '一方で、理論だけでも人生は変わりません。研究や概念を知っていても、現実の場面で「では何をするか」に変換できなければ、知識のままです。処世術禄では、理論を現実の行動へ落とし込みます。理論から実践へ。実践から理論へ。この往復によって、知識を「分かるもの」から「使えるもの」へ変えていきます。'],
  ['05', '何度でも使える', 'SNSや動画で偶然知った知識は、その場では納得しても、必要なときには思い出せないことがあります。処世術禄は、知識を一度消費して終わるものではなく、判断に迷ったときに何度でも戻ってこられる形で残します。必要なときに探し、読み返し、自分の判断に使う。流れて消える知識ではなく、蓄積される知恵にする。それが、処世術禄の役割です。'],
] as const;

const principles = [
  ['01', '処世術は好かれない', 'メタ発言抑制', '処世術そのものを過度に語ったり、「自分はこういう技術を使っている」とメタに説明した瞬間、自然な関係性や信頼が崩れることがある。処世術は思想として誇示するものではなく、必要な場面で静かに使うためのもの、という意味です。'],
  ['02', '処世術は万能ではない', 'コンテクスト依存性', '一つの方法を絶対視しないことが必要です。相手、場面、立場、力関係、時間軸、文化、目的が変われば、同じ行動でも意味や結果が変わります。処世術禄が「唯一の正解」を提示しないのは、そのためです。'],
  ['03', '処世術は人格の代替ではない', '行動分離原則', '処世術を身につけることと、人格そのものを作り替えることは別です。無理に好かれる人格になる必要も、社会に合わせて自分を消す必要もありません。自分の価値観や人格を守りながら社会と関わるための道具、それが処世術です。'],
  ['04', '処世術は知識ではない', '実践優先', '知識を集めること自体を目的化しないことが大切です。心理学や行動科学の理論を知っていても、現実の場面で判断や行動に変換できなければ意味が薄い。処世術禄は、知識を使える形に編み直すプロダクトです。'],
  ['05', '処世術は目的ではない', '手段従属', '処世術を上手に使うこと自体を人生の目的にしない。何を大切にするか、どんな人間でありたいか、どこへ向かうかを決めるのは本人です。処世術は、その目的を実現するための手段です。'],
] as const;

function Heading({ children, level = 2 }: { children: React.ReactNode; level?: 2 | 3 }) {
  return <AppText accessibilityRole="header" style={level === 2 ? styles.h2 : styles.h3}>{children}</AppText>;
}

function Paragraph({ children, emphasis = false, quiet = false }: { children: React.ReactNode; emphasis?: boolean; quiet?: boolean }) {
  return <AppText style={[styles.paragraph, emphasis && styles.emphasis, quiet && styles.noticeParagraph]}>{children}</AppText>;
}

export default function ShoseijutsuAboutScreen() {
  const router = useRouter();
  return (
    <Screen contentContainerStyle={styles.screenContent}>
      <View style={styles.article}>
        <SeoBreadcrumbs items={[{ label: 'ホーム', href: '/' }, { label: '処世術禄について' }]} />

        <View style={styles.hero}>
          <AppText style={styles.kicker}>処世術禄について</AppText>
          <AppText accessibilityRole="header" style={styles.heroTitle}>人生をうまく生きる方法を、すべての人へ。</AppText>
          <Paragraph>人生には、学校では教わらないことが多くあります。人との距離の取り方。信頼の築き方。仕事の進め方。失敗との付き合い方。自分自身の扱い方。</Paragraph>
          <Paragraph>私たちは、こうした知恵を「なんとなく分かっていること」のまま流してしまいます。</Paragraph>
          <Paragraph>処世術禄は、それらを集め、整理し、理論と結びつけ、必要なときに取り出して使える知恵へ変えるための場所です。</Paragraph>
          <Paragraph emphasis>聞いたことがある、で終わらせない。</Paragraph>
          <Paragraph>流れて消える人生の知識を、何度でも使える知恵に変える。それが、処世術禄の役割です。</Paragraph>
        </View>

        {chapters.map((chapter) => (
          <View key={chapter.title} style={styles.chapter}>
            <Heading>{chapter.title}</Heading>
            {chapter.paragraphs.map((paragraph) => <Paragraph key={paragraph}>{paragraph}</Paragraph>)}
            {chapter.emphasis.map((line) => <Paragraph key={line} emphasis>{line}</Paragraph>)}
            <Paragraph>{chapter.closing}</Paragraph>
          </View>
        ))}

        <View style={styles.chapter}>
          <Heading>なぜ、処世術禄なのか</Heading>
          <Paragraph>人生に役立つ知恵は、すでに世の中に数多く存在します。</Paragraph>
          <Paragraph>問題は、それらが散らばっていることです。</Paragraph>
          <Paragraph>人間関係の知恵は心理学の本にあり、仕事の進め方はビジネス書にあり、感情との付き合い方は哲学や行動科学にあり、人生についての知恵は誰かの経験談の中にある。</Paragraph>
          <Paragraph>一つひとつは役に立っても、それらを自分で探し、比較し、整理し、必要な場面で取り出すのは簡単ではありません。</Paragraph>
          <Paragraph>処世術禄は、その問題を解決するために設計されています。</Paragraph>
          <View style={styles.pillars}>
            {pillars.map(([number, title, body]) => (
              <View key={number} style={styles.pillar}>
                <AppText style={styles.pillarNumber}>{number}</AppText>
                <Heading level={3}>{title}</Heading>
                <Paragraph>{body}</Paragraph>
              </View>
            ))}
          </View>
          <Paragraph emphasis>網羅する。体系にする。理論につなぐ。実践に落とす。何度でも使える。</Paragraph>
        </View>

        <View style={styles.chapter}>
          <Heading>処世術禄の五大原則</Heading>
          <Paragraph>処世術禄は、処世術を人生の目的にせず、現実の中で静かに運用するための原則を掲げています。</Paragraph>
          <View style={styles.principles}>
            {principles.map(([number, title, concept, body]) => (
              <View key={number} style={styles.principle}>
                <AppText style={styles.principleNumber}>{number}</AppText>
                <Heading level={3}>{title}</Heading>
                <AppText style={styles.concept}>{concept}</AppText>
                <Paragraph>{body}</Paragraph>
              </View>
            ))}
          </View>
          <View style={styles.motto}>
            <AppText style={styles.mottoText}>語るな ／ 信じるな ／ 同一化するな</AppText>
            <AppText style={styles.mottoText}>運用せよ ／ 目的に従え</AppText>
          </View>
        </View>

        <View style={styles.chapter}>
          <Heading>知識を「使える形」にする</Heading>
          <Paragraph>世の中には、役に立つ知識がすでに大量にあります。</Paragraph>
          <Paragraph>心理学、行動科学、社会科学、哲学、歴史、書籍、経験則。</Paragraph>
          <Paragraph>問題は、知識がないことだけではありません。</Paragraph>
          <Paragraph emphasis>散らばっていること。忘れてしまうこと。そして、現実のどの場面で使えばいいのか分からないこと。</Paragraph>
          <Paragraph>処世術禄では、それらを「人物像」「処世術」「理論」という形で整理し、知識同士を結びつけます。</Paragraph>
          <Paragraph>一つの処世術から、その背景にある複数の理論へ進み、「なぜ効くのか」を知ることができる。</Paragraph>
          <Paragraph>逆に、心理学や行動科学をはじめとする理論から、それを現実でどう使えるのかを処世術として知ることもできる。</Paragraph>
          <Paragraph emphasis>知識を集めるのではなく、使える形に編み直す。</Paragraph>
          <Paragraph>これが処世術禄の基本設計です。</Paragraph>
        </View>

        <View style={styles.chapter}>
          <Heading>正解集ではなく、判断のOS</Heading>
          <Paragraph>処世術禄は、「こうすれば絶対にうまくいく」という人生の正解集を目指していません。</Paragraph>
          <Paragraph>人間も、状況も、時代も変わるからです。</Paragraph>
          <Paragraph>同じ行動でも、ある場面では正しく、別の場面では間違いになることがあります。</Paragraph>
          <Paragraph>だから必要なのは、無数の正解を暗記することではありません。</Paragraph>
          <Paragraph>状況を見て、考え、自分で選べることです。</Paragraph>
          <Paragraph>処世術禄が作ろうとしているのは、いわば人生をうまく生きるための思考のOSです。</Paragraph>
          <Paragraph>判断に迷ったとき、戻ってこられる場所。必要な知恵を探し、なぜそうするのかまで理解できる場所。</Paragraph>
          <Paragraph emphasis>人生をうまく生きる方法を、すべての人へ。</Paragraph>
          <Paragraph>処世術禄は、そのための知恵を編み続けます。</Paragraph>
        </View>

        <View style={styles.chapter}>
          <Heading>「処世術禄」と「処世術録」について</Heading>
          <Paragraph>正式名称は「処世術禄」です。</Paragraph>
          <Paragraph>「処世術録」と表記・検索されることがありますが、同じ本サービスを指します。</Paragraph>
        </View>

        <View style={styles.notice}>
          <Heading>大切な注意</Heading>
          <Paragraph quiet>本サービスは一般的な情報と判断の視点を提供することを目的としています。</Paragraph>
          <Paragraph quiet>医療、法律、税務、金融、投資、心理支援その他の専門的助言を代替するものではなく、個別の成果や安全を保証するものでもありません。</Paragraph>
          <Paragraph quiet>重要な判断については、個別の事情、法令、安全性などを確認したうえで、必要に応じて専門家へ相談してください。</Paragraph>
        </View>

        <Pressable accessibilityRole="link" onPress={() => router.push('/settings')} style={({ pressed }) => [styles.settingsLink, pressed && styles.pressed]}>
          <AppText style={styles.settingsLinkText}>設定へ戻る ›</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingTop: 20, paddingBottom: 120 },
  article: { width: '100%', maxWidth: 780, alignSelf: 'center' },
  hero: { paddingTop: 18, paddingBottom: 34, borderBottomWidth: 1, borderBottomColor: colors.line },
  kicker: { color: colors.gold, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20, letterSpacing: 2.2, fontWeight: '700' },
  heroTitle: { marginTop: 18, marginBottom: 28, color: colors.ink, fontFamily: fonts.serif, fontSize: 32, lineHeight: 48, fontWeight: '700' },
  chapter: { paddingTop: 58, paddingBottom: 10 },
  h2: { marginBottom: 22, color: colors.ink, fontFamily: fonts.serif, fontSize: 25, lineHeight: 36, fontWeight: '700' },
  h3: { marginTop: 2, marginBottom: 10, color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 30, fontWeight: '700' },
  paragraph: { marginBottom: 16, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 16, lineHeight: 30 },
  emphasis: { marginTop: 10, marginBottom: 22, color: colors.ink, fontSize: 19, lineHeight: 33, fontWeight: '700' },
  pillars: { marginTop: 20, borderTopWidth: 1, borderTopColor: colors.line },
  pillar: { paddingTop: 22, paddingBottom: 21, borderBottomWidth: 1, borderBottomColor: colors.line },
  pillarNumber: { marginBottom: 7, color: colors.gold, fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, letterSpacing: 1.5, fontWeight: '700' },
  principles: { marginTop: 16, borderTopWidth: 1, borderTopColor: colors.line },
  principle: { paddingTop: 24, paddingBottom: 23, borderBottomWidth: 1, borderBottomColor: colors.line },
  principleNumber: { marginBottom: 7, color: colors.gold, fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, letterSpacing: 1.5, fontWeight: '700' },
  concept: { marginBottom: 14, color: colors.gold, fontFamily: fonts.sans, fontSize: 12, lineHeight: 19, letterSpacing: 1.1 },
  motto: { marginTop: 28, paddingVertical: 23, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.gold },
  mottoText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 18, lineHeight: 32, letterSpacing: 1.6, textAlign: 'center' },
  notice: { marginTop: 52, paddingTop: 28, borderTopWidth: 1, borderTopColor: colors.line },
  noticeParagraph: { fontSize: 14, lineHeight: 25 },
  settingsLink: { alignSelf: 'flex-start', marginTop: 32, paddingVertical: 10, paddingHorizontal: 2 },
  settingsLinkText: { color: colors.gold, fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  pressed: { opacity: 0.62 },
});
