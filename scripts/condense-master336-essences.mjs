import fs from 'node:fs';

const file = 'src/data/generated/techniques.json';
const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));

const refinements = {
  'master336-010': '親しさは、相手の許可と同じ速さで育つ。',
  'master336-013': '「自分といえば」が、記憶の取っ掛かりになる。',
  'master336-016': '相手の言葉には、次の話題が埋まっている。',
  'master336-019': '感情を聞くと、情報がその人の物語になる。',
  'master336-020': '仮説は、質問より理解する姿勢を伝える。',
  'master336-026': '間は、相手が考えるための会話である。',
  'master336-030': '話の主役を奪わない人ほど、信頼される。',
  'master336-033': '感情を受け取って初めて、人は理解されたと感じる。',
  'master336-037': '親しさは、話の深さより安心して続くかで決まる。',
  'master336-038': '信頼は、破っても困らない約束で試される。',
  'master336-042': '弱みを守れる人に、本音は預けられる。',
  'master336-043': '信頼は、逆風でも変わらない態度に宿る。',
  'master336-046': '人は、苦しい時に隣にいた相手を忘れない。',
  'master336-048': '弱さの交換が、信頼を一方通行から救う。',
  'master336-063': '見返りを求めない恩ほど、長く残る。',
  'master336-067': 'ギャップは、理解を好奇心へ変える。',
  'master336-068': '小さな成長は「次も見たい」を生む。',
  'master336-069': '余白を残す人は、もう一度会いたくなる。',
  'master336-073': '面白さは、出来事より見落とされたズレに宿る。',
  'master336-077': '良いたとえは、理解を映像に変える。',
  'master336-078': '少しの誇張が、平凡な話に輪郭を与える。',
  'master336-079': '描写が浮かぶほど、話は人を引き込む。',
  'master336-082': '面白さは、言葉より表情・間・声色に宿る。',
  'master336-083': '本気で語れば、日常さえネタになる。',
  'master336-086': '狙わない一言ほど、笑いを連れてくる。',
  'master336-102': '罪悪感は、引き受ける義務の証明ではない。',
  'master336-116': '最初の無礼を許すと、次の基準になる。',
  'master336-118': '不機嫌に従うほど、主導権を渡してしまう。',
  'master336-121': '自信の見せ方が、相手の扱い方を変える。',
  'master336-128': '片方だけが与える関係は、静かに壊れる。',
  'master336-133': '一度の失敗より、修復できる関係を信じる。',
  'master336-141': '全員に好かれなくても、集団には居場所を持てる。',
  'master336-142': '自分らしさは、場の温度に合わせて開く。',
  'master336-156': '広く関わる人ほど、集団の温度を正しく読める。',
  'master336-161': '自分の世界を持つ人は、依存せず惹きつける。',
  'master336-169': '語らない余白が、想像を引き寄せる。',
  'master336-173': '「分からない」を言える人ほど、判断を誤らない。',
  'master336-180': '成果は、すべてに全力を出す人から逃げる。',
  'master336-182': '名前を覚えることは、存在を尊重することだ。',
  'master336-183': '敬意と萎縮は別物である。',
  'master336-185': '希少性は、仕事を選ぶ自由に変わる。',
  'master336-188': '緊急だけを追うと、重要な仕事は永遠に残る。',
  'master336-194': '意志より配置が、誘惑から行動を守る。',
  'master336-199': '全力の配分が、全体の成果を決める。',
  'master336-201': '興味の広さが、発想の広さになる。',
  'master336-205': '賢さは、答えより問いを疑うところに出る。',
  'master336-213': '「任せても事故らない」が仕事の格を上げる。',
  'master336-214': '努力ではなく、変えた結果が評価される。',
  'master336-219': '最初の評価は、次の機会まで呼び込む。',
  'master336-220': '辞められる人ほど、対等に評価を求められる。',
  'master336-222': '離れられる人だけが、対等に交渉できる。',
  'master336-238': '第三者は、膠着した構図そのものを変える。',
  'master336-252': '幸福を未来へ預けると、今日が空白になる。',
  'master336-256': '人生の形は、お金より時間の使い方に出る。',
  'master336-261': '健康は、失ってから同じ値段では買い戻せない。',
  'master336-263': '貢献は、手応えとつながりを同時に満たす。',
  'master336-266': '他人の成功は、自分の正解を保証しない。',
  'master336-276': '演じない時間が、本来の感覚を取り戻す。',
  'master336-279': '好奇心を選ぶほど、人生の材料が増える。',
  'master336-282': '異なる趣味が、人生の逃げ道を増やす。',
  'master336-287': '体験への出費は、人生の物語として残る。',
  'master336-289': '不安は消すものではなく、連れて動くものだ。',
  'master336-298': '不安も、人生の一場面として眺めれば進める。',
  'master336-302': '後悔は、やった道とやらなかった道の両方にある。',
  'master336-306': '過去への投資は、未来を縛る理由にならない。',
  'master336-313': '選ばなかった道だけが、いつも美しく見える。',
  'master336-314': '回復を急ぐほど、心は置き去りになる。',
  'master336-319': '失った道でも、身につけた力は残る。',
  'master336-321': '失敗のない人生より、立ち直った人生に物語が残る。',
  'master336-326': '知らない生き方は、知らない人が連れてくる。',
  'master336-331': '得意が増えるほど、選べる役割も増える。',
  'master336-335': '再起できる限り、失敗は試行回数に変わる。',
};

const lengthOf = (value) => [...value.replace(/\s/g, '')].length;

function condense(item) {
  if (refinements[item.id]) return refinements[item.id];
  if (lengthOf(item.essence) <= 26 && !/[。！？].+[。！？]/.test(item.essence)) return item.essence;

  const sentences = item.essence.match(/[^。！？]+[。！？]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
  const conclusion = sentences.at(-1) ?? item.essence;
  const punchline = conclusion.includes('、') ? conclusion.slice(conclusion.lastIndexOf('、') + 1) : conclusion;
  return /[。！？]$/.test(punchline) ? punchline : `${punchline}。`;
}

const items = catalog.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items));
for (const item of items) {
  const essence = condense(item);
  item.essence = essence;
  item.subtitle = essence;
}

fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);

const lengths = items.map((item) => lengthOf(item.essence));
console.log(JSON.stringify({
  techniques: items.length,
  minimum: Math.min(...lengths),
  maximum: Math.max(...lengths),
  average: Math.round(lengths.reduce((sum, length) => sum + length, 0) / lengths.length),
  over26: lengths.filter((length) => length > 26).length,
  duplicateEssences: items.length - new Set(items.map((item) => item.essence)).size,
}, null, 2));
