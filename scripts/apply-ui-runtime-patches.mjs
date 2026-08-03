import { readFile, writeFile } from 'node:fs/promises';

async function patch(path, transforms) {
  let source = await readFile(path, 'utf8');
  const original = source;
  for (const [before, after] of transforms) {
    if (source.includes(after)) continue;
    if (!source.includes(before)) throw new Error(`Patch target not found in ${path}: ${before.slice(0, 80)}`);
    source = source.replace(before, after);
  }
  if (source !== original) await writeFile(path, source);
}

async function patchFreeReel() {
  const path = 'src/app/(tabs)/index.tsx';
  let source = await readFile(path, 'utf8');
  const original = source;
  if (!source.includes("techniqueCards as catalogTechniqueCards")) {
    source = source.replace(
      "import { getTechniqueDisplayId, techniqueCards } from '@/data/catalog';",
      "import { getTechniqueDisplayId, techniqueCards as catalogTechniqueCards } from '@/data/catalog';\nimport { FREE_REEL_TECHNIQUE_IDS } from '@/access/access-config';\nimport { useAccess } from '@/access/access-state';",
    );
    const marker = 'export default function MainScreen() {';
    const [before, after] = source.split(marker);
    if (!after) throw new Error('MainScreen marker not found');
    source = `${before}${marker}${after.replaceAll('techniqueCards', 'visibleTechniqueCards')}`;
    source = source.replace(
      '  const { savedIds, toggleSaved } = useAppState();',
      `  const { savedIds, toggleSaved } = useAppState();\n  const { isPaid } = useAccess();\n  const visibleTechniqueCards = useMemo(\n    () => isPaid\n      ? catalogTechniqueCards\n      : FREE_REEL_TECHNIQUE_IDS\n          .map((id) => catalogTechniqueCards.find((card) => card.id === id))\n          .filter((card): card is TechniqueCard => Boolean(card)),\n    [isPaid],\n  );`,
    );
  }
  if (source !== original) await writeFile(path, source);
}

async function patchDiscover() {
  const path = 'src/app/(tabs)/discover.tsx';
  let source = await readFile(path, 'utf8');
  const original = source;
  if (!source.includes("FREE_TECHNIQUE_IDS")) {
    source = source.replace(
      "import { useTabVisible } from '@/hooks/use-tab-visible';",
      "import { useTabVisible } from '@/hooks/use-tab-visible';\nimport { useAccess } from '@/access/access-state';\nimport { FREE_TECHNIQUE_IDS, FREE_THEORY_ID_SET } from '@/access/access-config';",
    );
    source = source.replace(
      "  const [mode, setMode] = useState<BrowseMode>('techniques');",
      "  const [mode, setMode] = useState<BrowseMode>('techniques');\n  const { isPaid } = useAccess();",
    );
    source = source.replace(
      ": techniqueCards.filter((card) => {",
      ": techniqueCards.filter((card) => (isPaid || FREE_TECHNIQUE_IDS.has(card.id))).filter((card) => {",
    );
    source = source.replace('    [keywords],\n  );\n  const theoryMatches', '    [isPaid, keywords],\n  );\n  const theoryMatches');
    source = source.replace(
      ": theories.filter((theory) => {",
      ": theories.filter((theory) => (isPaid || FREE_THEORY_ID_SET.has(theory.tagId))).filter((theory) => {",
    );
    source = source.replace('    [keywords],\n  );\n\n  if (!isFocused)', '    [isPaid, keywords],\n  );\n\n  if (!isFocused)');
  }
  if (source !== original) await writeFile(path, source);
}

await patch('src/app/(tabs)/index.tsx', [
  ['  const minimumSize = compact ? 14 : 22;', '  const minimumSize = compact ? 10 : 18;'],
  ['                  minimumFontScale={0.82}', '                  minimumFontScale={0.5}'],
]);
await patchFreeReel();
await patchDiscover();

await patch('src/app/card/[id].tsx', [
  ["import { useAppState } from '@/state/app-state';", "import { useAppState } from '@/state/app-state';\nimport { useAccess } from '@/access/access-state';\nimport { canReadTechnique } from '@/access/access-config';\nimport { LockedPreview } from '@/components/locked-preview';"],
  ['  const { addHistory } = useAppState();', "  const { addHistory } = useAppState();\n  const { accessState } = useAccess();\n  const effectiveAccess = accessState === 'paid' ? 'paid' : accessState === 'free' ? 'free' : 'guest';"],
  ["  if (!card) {", "  if (card && !canReadTechnique(effectiveAccess, card.id)) {\n    return (\n      <Screen contentContainerStyle={styles.screenContent}>\n        <LockedPreview title={card.subcategory} description=\"この分類の処世術は完全版で読むことができます。無料版では実タイトルと本文を配信していません。\" count={1} source=\"discover_technique\" />\n      </Screen>\n    );\n  }\n\n  if (!card) {"],
  ['  const tags = Array.from(\n    new Set([card.categoryName, card.subcategory, ...(card.tags ?? [])]),\n  );', `  const tags = Array.from(\n    new Set([card.categoryName, card.subcategory, ...(card.tags ?? [])]),\n  );\n  const titleLength = [...card.title.replace(/\\s/g, '')].length;\n  const titleFontSize = titleLength <= 18 ? 34 : titleLength <= 24 ? 28 : titleLength <= 32 ? 22 : 16;`],
  ['          minimumFontScale={0.7}\n          style={styles.title}', '          minimumFontScale={0.5}\n          style={[styles.title, { fontSize: titleFontSize, lineHeight: Math.round(titleFontSize * 1.46) }]}'],
]);

await patch('src/app/subcategory/[category]/[name].tsx', [
  ["import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';", "import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';\nimport { useAccess } from '@/access/access-state';\nimport { LockedPreview } from '@/components/locked-preview';"],
  ['  const compact = width < 640;', '  const compact = width < 640;\n  const { isPaid } = useAccess();'],
  ["  const theme = persona.articleTitle ?? 'その他';", "  if (!isPaid && persona.name !== '印象がいい人') {\n    return (\n      <Screen><DetailHeader title=\"人物像から探す\" /><LockedPreview title={persona.name} description=\"この人物像の処世術は完全版に収録されています。\" count={persona.items.length} source=\"discover_technique\" /></Screen>\n    );\n  }\n\n  const theme = persona.articleTitle ?? 'その他';"],
]);

await patch('src/app/theories/[category].tsx', [
  ["import { theories } from '@/data/catalog';", "import { theories } from '@/data/catalog';\nimport { useAccess } from '@/access/access-state';\nimport { FREE_THEORY_ID_SET } from '@/access/access-config';\nimport { LockedPreview } from '@/components/locked-preview';"],
  ["  const { category } = useLocalSearchParams<{ category: string }>();", "  const { category } = useLocalSearchParams<{ category: string }>();\n  const { isPaid } = useAccess();"],
  ["  const scrollRef = useRef<ScrollView>(null);", "  const totalCount = items.length;\n  const visibleItems = isPaid ? items : items.filter((theory) => FREE_THEORY_ID_SET.has(theory.tagId));\n  const scrollRef = useRef<ScrollView>(null);"],
  ["  const title = category === 'all' ? 'すべての理論' : items[0]?.categoryTitle;", "  const title = category === 'all' ? 'すべての理論' : items[0]?.categoryTitle;"],
  ["      ? items.filter((theory) =>", "      ? visibleItems.filter((theory) =>"],
  ["      : [...items];", "      : [...visibleItems];"],
  ["  }, [items, query, sort]);", "  }, [query, sort, visibleItems]);"],
  ["      {filteredItems.length > 5 ? (", "      {!isPaid && totalCount > visibleItems.length ? (\n        <LockedPreview title={`${title}の完全版`} description=\"無料公開外の理論名と本文は、完全版で初めて表示されます。\" count={totalCount - visibleItems.length} source=\"discover_theory\" />\n      ) : null}\n      {filteredItems.length > 5 ? ("],
]);

await patch('src/app/(tabs)/my-os.tsx', [
  ["import { useTabVisible } from '@/hooks/use-tab-visible';", "import { useTabVisible } from '@/hooks/use-tab-visible';\nimport { OwnerPreviewPanel } from '@/components/owner-preview-panel';\nimport { useAuth } from '@/auth/auth-state';\nimport { useAccess } from '@/access/access-state';"],
  ["  const [memoDraft, setMemoDraft] = useState('');", "  const [memoDraft, setMemoDraft] = useState('');\n  const { user } = useAuth();\n  const { isPaid, restorePurchase } = useAccess();"],
  ["    <BookScreen>\n      <View style={styles.principleCard}>", "    <BookScreen>\n      <View style={styles.accountStrip}>\n        <AppText style={styles.accountStripLabel}>{user ? (isPaid ? '完全版・購入済み' : '無料版を利用中') : 'ログインせず無料版を利用中'}</AppText>\n        <Pressable onPress={() => router.push('/auth')}><AppText style={styles.accountStripAction}>{user ? 'アカウント' : 'ログイン'}</AppText></Pressable>\n        <Pressable onPress={() => void restorePurchase()}><AppText style={styles.accountStripAction}>購入を復元</AppText></Pressable>\n      </View>\n      <OwnerPreviewPanel />\n      <View style={styles.principleCard}>"],
  ["const styles = StyleSheet.create({", "const styles = StyleSheet.create({\n  accountStrip: { minHeight: 54, marginBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },\n  accountStripLabel: { flex: 1, color: colors.inkSoft, fontSize: 12, fontWeight: '700' },\n  accountStripAction: { color: colors.gold, fontSize: 12, fontWeight: '700' },"],
]);
