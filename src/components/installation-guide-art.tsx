import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { SaveDiamond } from '@/components/save-diamond';
import { categories, getTechniqueDisplayId, getTheoryDisplayId, techniqueById, theoryById } from '@/data/catalog';
import { getTheoryCoverSummary } from '@/data/theory-display';
import { fonts } from '@/constants/theme';

const landscape = require('../../assets/welcome/guide-ink-plum.webp');
const gold = '#A17736';
const serif = fonts.serif;
type Icon = 'people' | 'hands' | 'head' | 'pen' | 'quote';
const icons: Record<Icon, string> = {
  people: '<circle cx="9" cy="7" r="3.5"/><path d="M2 21v-2c0-3.8 2.8-6 7-6s7 2.2 7 6v2H2Zm14-17a3.4 3.4 0 0 1 0 6.6m2 2.8c3 .8 4 3 4 6.6"/>',
  hands: '<path d="m1.5 10 4-6 4 2-4 7-4-3Zm21 0-4-6-4 2 4 7 4-3Zm-16 2 8 7c1 1 2 0 2.2-1.1m-7.4-3.7 5.4 4.7m-2.2-6.5 5.5 4.6c1.5 1 2.8-1 1.5-2l-7-6-2.5 2.2c-1.5 1.3-3.2-1-1.8-2.2L12 5.5l3.8 1M5.5 13l-1.8 2 4.5 4m.9-1.6-1.6 2c-.8 1-.1 2 1 2l3-2.1"/>',
  head: '<path d="M16 23H8v-4H5v-4H2l2.3-4.8A8.7 8.7 0 0 1 22 11c0 3.6-2.3 6.1-6 7v5ZM8 10a4 4 0 0 1 8 0c0 2.1-2.6 2.7-2.6 4.8"/>',
  pen: '<path d="m4 16-1 5 5-1L21 7l-4-4L4 16Zm10.5-10.5 4 4m-13 6 4 4"/>',
  quote: '<path fill="currentColor" stroke="none" d="M3 17c0-6 2-9 7-11v2c-2.5 1.5-3.7 3-3.7 5H10v6H3Zm11 0c0-6 2-9 7-11v2c-2.5 1.5-3.7 3-3.7 5H21v6h-7Z"/>',
};

function svg(body: string, viewBox: string) {
  return { uri: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`) };
}

function ArtIcon({ name, size }: { name: Icon; size: number }) {
  return <Image accessibilityElementsHidden aria-hidden source={svg(`<g color="${gold}" fill="none" stroke="${gold}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</g>`, '0 0 24 24')} style={{ width: size, height: size }} />;
}

const wavePaths = '<path d="M-12 36a33 33 0 0 1 66 0m-60 0a27 27 0 0 1 54 0m-48 0a21 21 0 0 1 42 0m-36 0a15 15 0 0 1 30 0M26 36a33 33 0 0 1 66 0m-60 0a27 27 0 0 1 54 0m-48 0a21 21 0 0 1 42 0m-36 0a15 15 0 0 1 30 0"/>';
export const guideWaves = svg(`<defs><pattern id="waves" width="76" height="36" patternUnits="userSpaceOnUse"><g fill="none" stroke="#BB975B" stroke-width="1.4">${wavePaths}</g></pattern><linearGradient id="t" x1="1" x2="0" y1="1" y2="0"><stop stop-color="white"/><stop offset=".72" stop-color="black"/></linearGradient><mask id="fade"><rect width="100%" height="100%" fill="url(#t)"/></mask></defs><rect width="100%" height="100%" fill="url(#waves)" mask="url(#fade)"/>`, '0 0 150 210');

const decorativeCard = svg(`<defs><linearGradient id="paper" x2="1" y2="1"><stop stop-color="#FFFDF5" stop-opacity=".94"/><stop offset="1" stop-color="#C9A16A" stop-opacity=".10"/></linearGradient></defs><rect width="150" height="210" fill="url(#paper)"/>`, '0 0 150 210');
const cardColors = ['#6B8197', '#B66648', '#7C815B'];
const cardFaces = ['#FCF2E4', '#FCF0DF', '#F6F0DD'];

type Cover = { caption?: string; title: string; note?: string; icon?: Icon | 'save' };
function knowledgeCovers(): Cover[] {
  const theory = theoryById.get('kb_004');
  const technique = techniqueById.get('master336-071');
  const persona = categories.flatMap(category => category.subcategories).find(entry => entry.name === '印象がいい人');
  return [
    { caption: theory ? `理論　${getTheoryDisplayId(theory)}` : '理論', title: theory?.title ?? '', note: theory?.summary ? getTheoryCoverSummary(theory.summary) : undefined },
    { caption: technique ? `${technique.categoryName}　${getTechniqueDisplayId(technique)}` : '処世術', title: technique?.title ?? '', note: technique?.essence },
    { caption: '人物像', title: persona?.name ?? '' },
  ];
}

export function GuideCovers({ width, variant }: { width: number; variant: 'knowledge' | 'personal' | 'complete' }) {
  const complete = variant === 'complete';
  const covers: Cover[] = variant === 'knowledge' ? knowledgeCovers() : variant === 'personal' ? [
    { title: 'お気に入り', icon: 'save' }, { title: 'マイ処世術', icon: 'pen' }, { title: '座右の銘', icon: 'quote' },
  ] : [{ title: '理論' }, { title: '処世術' }, { title: '人物像' }];
  return <View testID="guide-artwork" style={{ width, height: width * .69 }}>
    <Image accessibilityElementsHidden aria-hidden source={landscape} contentFit="fill" style={[styles.landscape, { bottom: -width * .07, height: width * .66 }]} />
    {covers.map((cover, index) => {
      const center = index === 1;
      const spineColor = cardColors[index];
      return <View key={index} style={[styles.cover, {
        left: `${[10, 34, 62][index]}%`, top: `${center ? 4 : 18}%`, width: `${center ? 34 : 30}%`, height: `${center ? 77 : 68}%`,
        backgroundColor: cardFaces[index], zIndex: center ? 2 : 1, transform: [{ rotate: ['-13deg', complete ? '0deg' : '4deg', '13deg'][index] }],
      }]}>
        <View style={[styles.paper, complete && styles.bookPaper]}>
          <Image accessibilityElementsHidden aria-hidden source={decorativeCard} contentFit="fill" style={StyleSheet.absoluteFill} />
          <Image accessibilityElementsHidden aria-hidden source={guideWaves} contentFit="fill" style={[styles.coverOrnament, { opacity: index === 1 ? .38 : .27 }]} />
          <View style={[styles.spine, complete && styles.bookSpine, { backgroundColor: spineColor }]} />
          {complete ? <View aria-hidden style={styles.coverFrame} /> : null}
          {complete ? [16, 49, 81].map(top => <View key={top} aria-hidden style={[styles.binding, { top: `${top}%` }]} />) : null}
          <View style={[styles.coverContent, variant !== 'knowledge' && styles.coverContentCentered, !complete && index === 0 && styles.leftCoverContent, !complete && index === 2 && styles.rightCoverContent]}>
            {cover.caption ? <AppText maxFontSizeMultiplier={1.15} style={[styles.caption, { color: spineColor }]}>{cover.caption}</AppText> : null}
            {cover.icon === 'save' ? <SaveDiamond saved /> : cover.icon ? <ArtIcon name={cover.icon} size={24} /> : null}
            <AppText maxFontSizeMultiplier={1.15} style={[styles.coverTitle, { fontSize: complete ? width * .066 : width * (center ? .044 : .037) }, complete && styles.verticalTitle]}>
              {complete ? [...cover.title].join('\n') : cover.title}
            </AppText>
            {cover.note ? <AppText maxFontSizeMultiplier={1.15} style={styles.coverNote}>{cover.note}</AppText> : null}
            {variant === 'personal' ? <View aria-hidden style={styles.goldRule} /> : null}
          </View>
        </View>
      </View>;
    })}
  </View>;
}

// Positions follow the artwork. Each cross-group thread is based on a
// current persona membership or the technique's published theory references.
const techniqueNodes = [
  ['master336-071', 86, 142],
  ['master336-060', 69, 204],
  ['master336-014', 300, 142],
  ['master336-172', 313, 204],
] as const;
const theoryNodes = [['kb_004', 91, 279], ['kb_029', 196, 322], ['kb_190', 297, 279]] as const;
const personaNodes = [['人たらしの人', 86, 64], ['印象がいい人', 285, 43], ['仕事ができる人', 319, 95]] as const;
const hubs = [
  { title: '人物像', type: 'people', x: 194, y: 69, size: 64 },
  { title: '処世術', type: 'hands', x: 194, y: 171, size: 83 },
  { title: '理論', type: 'head', x: 194, y: 266, size: 64 },
] as const;

type Node = { title: string; x: number; y: number; width: number };
function link(a: Pick<Node, 'x' | 'y'>, b: Pick<Node, 'x' | 'y'>, opacity = .55) {
  const bend = (b.y - a.y) * .57;
  const sweep = (b.x - a.x) * .21 || 15;
  return `<path d="M${a.x} ${a.y}C${a.x + sweep} ${a.y + bend},${b.x - sweep} ${b.y - bend},${b.x} ${b.y}" opacity="${opacity}"/>`;
}

export function GuideKnowledgeNetwork({ width }: { width: number }) {
  const scale = width / 390;
  const personas = new Set(categories.flatMap(category => category.subcategories.map(entry => entry.name)));
  const profiles = personaNodes.filter(([title]) => personas.has(title)).map(([title, x, y]) => ({ title, x, y, width: 87 }));
  const actions = techniqueNodes.flatMap(([id, x, y]) => {
    const card = techniqueById.get(id);
    return card ? [{ title: card.title, x, y, width: 99, card }] : [];
  });
  const theories = theoryNodes.flatMap(([id, x, y]) => {
    const theory = theoryById.get(id);
    return theory ? [{ id: theory.tagId, title: theory.title, x, y, width: 101 }] : [];
  });
  const threads = [
    link(hubs[0], hubs[1], .85), link(hubs[1], hubs[2], .85),
    ...profiles.map(node => link(hubs[0], node)),
    ...actions.map(node => link(hubs[1], node)),
    ...theories.map(node => link(hubs[2], node)),
    ...actions.flatMap(node => [
      ...profiles.filter(profile => profile.title === node.card.subcategory).map(profile => link(profile, node, .46)),
      ...theories.filter(theory => node.card.theoryTagIds?.includes(theory.id)).map(theory => link(node, theory, .46)),
    ]),
  ].join('');
  const nodes = [...profiles, ...actions, ...theories];
  const fields = '<ellipse cx="196" cy="63" rx="154" ry="62" fill="#F0DDC0" opacity=".28"/><ellipse cx="193" cy="173" rx="189" ry="69" fill="#EAC693" opacity=".23"/><ellipse cx="195" cy="279" rx="165" ry="62" fill="#EDD7B5" opacity=".26"/>';
  const network = svg(`<g>${fields}</g><g fill="none" stroke="#B58C46" stroke-width=".85">${threads}</g>`, '0 0 390 348');
  return <View style={{ width, height: width * 348 / 390 }} testID="guide-artwork">
    <Image accessibilityElementsHidden aria-hidden source={network} style={StyleSheet.absoluteFill} contentFit="fill" />
    {nodes.map(node => <View key={node.title} style={[styles.node, {
      left: (node.x - node.width / 2) * scale, top: (node.y - 21) * scale, width: node.width * scale, minHeight: 42 * scale,
    }]}><AppText style={[styles.nodeTitle, { fontSize: 10.7 * scale, lineHeight: 13.3 * scale }]}>{node.title}</AppText></View>)}
    {hubs.map(hub => <View key={hub.type} style={[styles.hub, {
      left: (hub.x - hub.size / 2) * scale, top: (hub.y - hub.size / 2) * scale, width: hub.size * scale, height: hub.size * scale,
    }]}>
      <ArtIcon name={hub.type} size={(hub.type === 'hands' ? 27 : 21) * scale} />
      <AppText style={[styles.hubTitle, { fontSize: (hub.type === 'hands' ? 19 : 15) * scale }]}>{hub.title}</AppText>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  landscape: { position: 'absolute', left: 0, width: '100%', opacity: .87 },
  cover: { position: 'absolute', borderRadius: 10, shadowColor: '#614A2E', shadowOpacity: .28, shadowOffset: { width: 1, height: 11 }, shadowRadius: 12, elevation: 4 },
  paper: { flex: 1, overflow: 'hidden', borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#F9F2E6', justifyContent: 'center' },
  bookPaper: { borderRadius: 5, borderColor: '#CEB487', borderWidth: 1 },
  spine: { position: 'absolute', width: '7%', left: 0, top: 0, bottom: 0, opacity: .93 },
  bookSpine: { width: '11%', borderRightColor: '#755435', borderRightWidth: 1 },
  coverFrame: { position: 'absolute', top: '5%', bottom: '5%', left: '14%', right: '6%', borderWidth: 1, borderColor: '#C5A670' },
  binding: { position: 'absolute', left: 0, width: '12%', height: 2, backgroundColor: '#DFC078', borderRadius: 1 },
  coverOrnament: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' },
  coverContent: { paddingLeft: '14%', paddingRight: '8%', gap: 5 },
  leftCoverContent: { paddingRight: '24%' },
  rightCoverContent: { paddingLeft: '25%' },
  coverContentCentered: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  caption: { fontFamily: serif, fontSize: 10, lineHeight: 15, fontWeight: '700' },
  coverTitle: { fontFamily: serif, color: '#1D1913', fontWeight: '700' },
  verticalTitle: { textAlign: 'center', lineHeight: 32 },
  coverNote: { fontFamily: serif, color: '#655C4E', fontSize: 8, lineHeight: 12 },
  goldRule: { width: 23, height: 1, backgroundColor: '#C4A066' },
  node: { position: 'absolute', zIndex: 1, borderRadius: 999, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF9ED', paddingHorizontal: 6, shadowColor: '#826437', shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, shadowOpacity: .16 },
  nodeTitle: { textAlign: 'center', fontFamily: serif, color: '#211D17', fontWeight: '700' },
  hub: { position: 'absolute', zIndex: 2, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 999, borderWidth: 1, borderColor: '#D0A960', backgroundColor: '#FFF1D3', shadowColor: '#B98C3F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: .24, shadowRadius: 9 },
  hubTitle: { color: '#211911', fontFamily: serif, fontWeight: '700' },
});
