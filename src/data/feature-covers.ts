import type { ImageSourcePropType } from 'react-native';
import type { FeatureArticle } from './features';

type FeatureCover = {
  title: string;
  originalImage: string;
  source: ImageSourcePropType;
  alt: string;
  headline: string;
  accent: string;
  background: string;
};

// Stable article IDs keep covers attached when a URL changes. A CMS title or
// image edit takes precedence so an old editorial caption cannot mislabel it.
const covers: Record<string, FeatureCover> = {
  'five-guidelines': {
    title: '押さえておくべき5つの処世術指針', originalImage: 'bundled:feature-coast',
    source: require('../../assets/features/five-guidelines-cover.webp'),
    alt: '五つに分かれる金色の道と、進む方向を示すコンパス',
    headline: '迷ったら\n5つの指針', accent: '#F2D58E', background: '#103C40',
  },
  'meta-comments': {
    title: 'メタ発言はなぜ気分を害するのか', originalImage: 'bundled:feature-forest',
    source: require('../../assets/features/meta-comments-cover.webp'),
    alt: '向かい合う二人の間で、虫眼鏡によって切り分けられる吹き出し',
    headline: 'その分析、\n必要ですか', accent: '#FFE0B8', background: '#873B30',
  },
  '8a718f9d-e1c0-4bd0-8e7d-fae669f935a6': {
    title: 'なぜ私たちは、年齢に焦るのか', originalImage: 'bundled:feature-coast',
    source: require('../../assets/features/the-secret-behind-age-cover.webp'),
    alt: '大きな時計の周囲を別々の速さで歩き、自分の道へ進む人々',
    headline: '年齢への\n焦りの正体', accent: '#FBE69A', background: '#16366F',
  },
  '788e744e-3659-4876-bcd3-b2d9bffbd92d': {
    title: '挫折が与える人生への功罪', originalImage: 'bundled:feature-coast',
    source: require('../../assets/features/be-broken-cover.webp'),
    alt: '途切れた階段の前で立ち止まる人と、その下に続く別の道',
    headline: '挫折の先に\n残るもの', accent: '#FFD2B8', background: '#482641',
  },
  'e0619024-c6ec-4a47-a374-46c4695a8659': {
    title: '言語化の気味悪さ', originalImage: 'bundled:feature-forest',
    source: require('../../assets/features/verbalization-cover.webp'),
    alt: '四角い吹き出しの枠からあふれ出す、複雑な色と形の感情',
    headline: '言葉の外に\nあるもの', accent: '#E5ED9A', background: '#173E2C',
  },
  '7c1d3cde-175e-4b0c-8578-a176205bdf58': {
    title: 'メタ認知時代と戦略的ティルトのススメ', originalImage: 'bundled:feature-coast',
    source: require('../../assets/features/metacognition-cover.webp'),
    alt: '観察するための暗いブースから、明るい舞台へ踏み出す人',
    headline: '考えすぎる\n自分を降りる', accent: '#FFE49B', background: '#863C1D',
  },
};

export function featureCover(article: Pick<FeatureArticle, 'id' | 'title' | 'image_path'>) {
  const cover = covers[article.id];
  return cover && article.title === cover.title && article.image_path === cover.originalImage ? cover : undefined;
}
