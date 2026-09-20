import type { ImageSource } from 'expo-image';

export type PersonaPresentation = {
  number: number;
  subtitle: string;
  image: ImageSource;
};

const presentations: Record<string, PersonaPresentation> = {
  '印象がいい人': { number: 1, subtitle: '初対面から好感を持たれる振る舞い方', image: require('../../assets/personas/persona-01.webp') },
  '人たらしの人': { number: 2, subtitle: '自然と人の懐に入る距離の縮め方', image: require('../../assets/personas/persona-02.webp') },
  '会話がうまい人': { number: 3, subtitle: '話を広げ、心地よい会話をつくる方法', image: require('../../assets/personas/persona-03.webp') },
  '聞き上手な人': { number: 4, subtitle: '相手が話したくなる聞き方', image: require('../../assets/personas/persona-04.webp') },
  '信頼される人': { number: 5, subtitle: '安心して任せてもらうための振る舞い', image: require('../../assets/personas/persona-05.webp') },
  '面白い人': { number: 6, subtitle: '会話や場を楽しくする話し方と工夫', image: require('../../assets/personas/persona-06.webp') },
  '人を見極められる人': { number: 7, subtitle: '言葉と行動から本質を見抜く観察方法', image: require('../../assets/personas/persona-07.webp') },
  '人に振り回されない人': { number: 8, subtitle: '相手に流されず自分の軸を保つ方法', image: require('../../assets/personas/persona-08.webp') },
  '軽く扱われない人': { number: 9, subtitle: '敬意をもって接してもらう境界線の引き方', image: require('../../assets/personas/persona-09.webp') },
  '人間関係が安定する人': { number: 10, subtitle: '無理なく関係を長く保つための工夫', image: require('../../assets/personas/persona-10.webp') },
  '集団に馴染める人': { number: 11, subtitle: '自分らしさを保ちながら場に溶け込む方法', image: require('../../assets/personas/persona-11.webp') },
  'リーダーシップがある人': { number: 12, subtitle: '人を導き、力を引き出す振る舞い方', image: require('../../assets/personas/persona-12.webp') },
  'カリスマ性のある人': { number: 13, subtitle: '人を惹きつけ、自然に影響を広げる方法', image: require('../../assets/personas/persona-13.webp') },
  '仕事ができる人': { number: 14, subtitle: '成果につながる仕事の進め方', image: require('../../assets/personas/persona-14.webp') },
  'タスク処理がうまい人': { number: 15, subtitle: '優先順位を整え、着実に片づける方法', image: require('../../assets/personas/persona-15.webp') },
  '頭がいい人': { number: 16, subtitle: '複雑な状況を整理し、答えを導く考え方', image: require('../../assets/personas/persona-16.webp') },
  '正しく評価される人': { number: 17, subtitle: '努力と成果を正しく伝える見せ方', image: require('../../assets/personas/persona-17.webp') },
  '交渉がうまい人': { number: 18, subtitle: '双方が納得する合意のつくり方', image: require('../../assets/personas/persona-18.webp') },
  '組織でうまく立ち回れる人': { number: 19, subtitle: '立場や関係を読み、力を発揮する方法', image: require('../../assets/personas/persona-19.webp') },
  '充実した人生を過ごせる人': { number: 20, subtitle: '日々に充足をつくる時間の使い方', image: require('../../assets/personas/persona-20.webp') },
  '自分らしく生きられる人': { number: 21, subtitle: '周囲に流されず自分の基準で選ぶ方法', image: require('../../assets/personas/persona-21.webp') },
  '人生を楽しめる人': { number: 22, subtitle: '日常の中に楽しさを見つける工夫', image: require('../../assets/personas/persona-22.webp') },
  '不安に強い人': { number: 23, subtitle: '不安に飲まれず落ち着きを取り戻す方法', image: require('../../assets/personas/persona-23.webp') },
  '後悔しない人': { number: 24, subtitle: '納得できる選択を重ねる判断方法', image: require('../../assets/personas/persona-24.webp') },
  '立ち直れる人': { number: 25, subtitle: 'つまずきから回復し前へ進む方法', image: require('../../assets/personas/persona-25.webp') },
  '可能性を広げられる人': { number: 26, subtitle: '選択肢を増やし未来をひらく工夫', image: require('../../assets/personas/persona-26.webp') },
};

export function getPersonaPresentation(name: string): PersonaPresentation | undefined {
  return presentations[name];
}

export function formatPersonaNumber(number: number) {
  return String(number).padStart(2, '0');
}
