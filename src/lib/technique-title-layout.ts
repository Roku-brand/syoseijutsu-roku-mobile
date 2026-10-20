export type TitleLayout = { fontSize: number; lines: string[] };
type Measure = (text: string, fontSize: number) => number;

const particles = new Set(['は', 'が', 'を', 'に', 'へ', 'で', 'と', 'から', 'まで', 'より', 'ので', 'なら']);
const continuations = new Set(['ない', 'なく', 'なる', 'する', 'いる', 'れる', 'られる', 'せる', 'させる', 'やす', 'さ']);
const cannotStart = /^[、。，．！？・：；）］｝」』ぁぃぅぇぉゃゅょっァィゥェォャュョッー]/;

function breakCosts(title: string) {
  const costs = new Map<number, number>();
  let offset = 0;
  for (const char of title) {
    offset += char.length;
    if (!cannotStart.test(title.slice(offset)) && !/[（「『［]$/.test(title.slice(0, offset))) costs.set(offset, 1200);
  }
  const segments = typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter('ja', { granularity: 'word' }).segment(title)]
    : [...title.matchAll(/[^、，・はがをにへでと]+|[、，・はがをにへでと]/gu)].map(match => ({ index: match.index, segment: match[0] }));
  segments.forEach((segment, index) => {
    const end = segment.index + segment.segment.length;
    const next = segments[index + 1]?.segment;
    if (!costs.has(end)) return;
    if (next && particles.has(next)) { costs.delete(end); return; }
    const phraseEnd = particles.has(segment.segment) || /[、，・：]$/.test(segment.segment) || /(?:ではなく|ので|なら)$/.test(title.slice(0, end));
    costs.set(end, next && continuations.has(next) ? 900 : phraseEnd ? 0 : 200);
  });
  costs.set(title.length, 0);
  return costs;
}

function wrap(title: string, width: number, fontSize: number, measure: Measure, costs: Map<number, number>) {
  const ends = [0, ...costs.keys()].sort((a, b) => a - b);
  const best = new Map<number, { cost: number; lines: string[] }>([[0, { cost: 0, lines: [] }]]);
  for (let endIndex = 1; endIndex < ends.length; endIndex++) {
    const end = ends[endIndex];
    for (let startIndex = endIndex - 1; startIndex >= 0; startIndex--) {
      const start = ends[startIndex];
      const before = best.get(start);
      if (!before) continue;
      const text = title.slice(start, end);
      const measured = measure(text, fontSize);
      if (measured > width) continue;
      const orphan = end === title.length && start > 0 && [...text].length < 3 ? 900 : 0;
      const cost = before.cost + 1000 + (costs.get(end) ?? 0) + 60 * (1 - measured / width) ** 2 + orphan;
      if (cost < (best.get(end)?.cost ?? Infinity)) best.set(end, { cost, lines: [...before.lines, text] });
    }
  }
  return best.get(title.length)?.lines ?? [title];
}

/** Fit a complete title on one line first; otherwise keep Japanese phrases together. */
export function layoutTechniqueTitle(title: string, width: number, baseSize: number, minimumSize: number, measure: Measure): TitleLayout {
  if (!title || width <= 0) return { fontSize: baseSize, lines: [title] };
  const available = Math.max(1, width - 2);
  const minimum = Math.min(baseSize, minimumSize);
  const fitSize = (fits: (size: number) => boolean) => {
    let low = minimum;
    let high = baseSize;
    for (let attempt = 0; attempt < 9; attempt++) {
      const mid = (low + high) / 2;
      if (fits(mid)) low = mid;
      else high = mid;
    }
    return Math.floor(low * 10) / 10;
  };
  if (measure(title, baseSize) <= available) return { fontSize: baseSize, lines: [title] };
  if (measure(title, minimum) <= available) {
    return { fontSize: fitSize(size => measure(title, size) <= available), lines: [title] };
  }
  const costs = breakCosts(title);
  const minimumLines = wrap(title, available, minimum, measure, costs);
  const targetLines = Math.max(2, minimumLines.length);
  const quality = (lines: string[]) => {
    let offset = 0;
    return lines.slice(0, -1).reduce((sum, line) => { offset += line.length; return sum + (costs.get(offset) ?? 1200); }, 0);
  };
  const maximumCost = quality(minimumLines);
  const fits = (lines: string[]) => lines.length <= targetLines && quality(lines) <= maximumCost;
  const baseLines = wrap(title, available, baseSize, measure, costs);
  if (fits(baseLines)) return { fontSize: baseSize, lines: baseLines };
  const size = fitSize(value => fits(wrap(title, available, value, measure, costs)));
  return { fontSize: size, lines: wrap(title, available, size, measure, costs) };
}
