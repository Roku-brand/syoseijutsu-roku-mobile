import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src/data/generated/techniques.json');
const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));

const fieldGuidance = {
  interpersonal: {
    structure: '対人関係では、相手の言葉だけでなく、表情、沈黙、返信の速さのような小さな反応からも、安心して関われるかが判断されている。',
    behaviour: 'こちらの都合を通す前に相手の受け取り方を確かめるほど、関係の温度を不用意に下げずに済む。',
    defaultScene: '会話、メッセージ、頼みごとなど、関係の温度を測りにくい場面で差が出る',
    defaultAction: '相手の反応を一度受け止め、急いで結論や評価を返さず、次に何を望んでいるかを短く確かめる',
    defaultPractice: 'その日のやり取りを一つ選び、「相手は何を守ろうとしていたか」を後から言葉にしてみる',
    defaultWatch: '自分だけが我慢する方法にすると長続きしないため、無理を感じる地点も同時に把握しておく',
  },
  work: {
    structure: '仕事では、善意や努力そのものより、周囲が次の判断や行動を取れる状態になっているかで信頼と評価が決まりやすい。',
    behaviour: '個人の頑張りを見せるより、情報・期限・責任の位置を揃えるほど、成果は周囲から再現可能なものとして扱われる。',
    defaultScene: '会議、報告、依頼、締切前の調整など、複数人の仕事がつながる場面で差が出る',
    defaultAction: '目的、現状、次に必要な判断を一文ずつに分け、相手が返答しやすい形で渡す',
    defaultPractice: '一つの案件で、相手が次に迷う点を先回りして書き出し、共有する情報の順番を整える',
    defaultWatch: '情報を増やしすぎると判断が遅れるため、今決めることと保留することを混ぜない',
  },
  life: {
    structure: '人生の判断では、今の気分や一度の結果が視野を狭めやすく、選べる余地を残しているかが後から効いてくる。',
    behaviour: '正解を急いで固定するより、見直せる小さな選択として扱うほど、損失を抑えながら自分に合う方向を確かめられる。',
    defaultScene: '進路、習慣、人間関係、時間の使い方など、すぐには答えが出ない選択で差が出る',
    defaultAction: '感情が強いときほど結論を一晩置き、判断の理由と失っても耐えられる範囲を分けて考える',
    defaultPractice: '今週中にできる小さな試行を一つ決め、終わったら気分ではなく起きた事実を記録する',
    defaultWatch: '変化を急ぐあまり、休息や生活の土台まで削らないよう、続けられる負荷に調整する',
  },
};

const keywordGuidance = [
  [/初対面|第一印象|印象|清潔|身だしなみ|表情|姿勢|視線|声|名前/, {
    scene: '初対面や短い会話では、相手は内容を吟味する前に、警戒を解いてよい相手かを短時間で見ている',
    action: '会う前に髪・服・口元・持ち物を整え、話し始めは相手の声量と速さに合わせて、名前や話題を急がず扱う',
    practice: '会う直前の三十秒を「整える時間」と決め、相手の話を遮らず一度要約して返す',
    watch: '作り込んだ演出は距離を生むこともあるので、好かれようとするより不快にさせない基準を優先する',
  }],
  [/聞|会話|質問|話題|沈黙|相づち|返事|メッセージ|LINE|返信/, {
    scene: '会話では、話題の面白さ以上に「自分の話がどう扱われたか」が次の発言のしやすさを決める',
    action: '相手の言葉の結論だけで返さず、感情か事情のどちらかを一度受け止めてから、答えや質問を一つに絞る',
    practice: '次の会話で、助言を急がず「それで何が一番困ったのか」と一度だけ掘り下げる',
    watch: '聞くことを尋問に変えないよう、答えにくそうなら自分の話題へ戻れる余白を残す',
  }],
  [/約束|信頼|秘密|誠実|嘘|連絡|報告|謝|謝罪|修復/, {
    scene: '信頼は大きな宣言より、忙しいときや面倒なときにどの程度の情報を省くかで判断されやすい',
    action: '守れない可能性が出た時点で、事実・影響・次の対応を短く伝え、相手に推測や催促をさせない',
    practice: '今週の小さな約束を一つ選び、期限の前に状況を共有する習慣を試す',
    watch: '事情の説明を長くして責任をぼかすと逆効果なので、言い訳より先に相手への影響を示す',
  }],
  [/距離|境界|断|断る|無礼|雑|軽く|不機嫌|挑発|嫌|離れ/, {
    scene: '関係が近いほど、相手は許される範囲を言葉より反応から学び、曖昧な譲歩は次の要求の基準になりやすい',
    action: '不快な行為には人格を裁かず、受け入れられない事実と今後の扱いを短く伝え、必要なら接点の量を減らす',
    practice: '繰り返し負担になっていることを一つ選び、「私はここまではできる」と具体的な境界に言い換える',
    watch: '感情が高い瞬間に絶縁まで決めず、距離を置く・頻度を下げるなど段階的な選択肢も残す',
  }],
  [/グループ|仲間|輪|味方|人脈|紹介|つな|関係|縁/, {
    scene: '人のつながりは、誰と知り合いかより、安心して紹介してよい人だと周囲に思われるかで広がる',
    action: '会った人の近況や利害を覚えておき、頼みごとの前後には感謝と結果を返して、関係を一回で使い切らない',
    practice: '今月会った相手を三人だけ振り返り、負担のない近況連絡か役立つ情報を一つ送る',
    watch: '人脈を数として扱うと相手の警戒を招くため、紹介や依頼は双方に利益がある時だけにする',
  }],
  [/交渉|条件|譲|価格|要求|合意|選択肢|代替|沈黙|面子/, {
    scene: '利害がぶつかる場面では、要求の強さより、相手が受け入れても立場を失わない着地点があるかで合意の質が変わる',
    action: '自分の希望、譲れる範囲、譲れない条件を事前に分け、相手の制約を聞いてから複数の案として示す',
    practice: '次の依頼で、第一希望だけでなく代替案を二つ用意し、相手が選べる形で伝える',
    watch: '相手を言い負かすことを目的にすると次の協力が失われるため、合意後の関係まで含めて判断する',
  }],
  [/締切|期限|予定|時間|タスク|優先|段取|完了|先延ばし|集中/, {
    scene: '仕事や生活の遅れは能力不足より、何を終えたら前に進むかが曖昧なまま、細かな作業を抱え込むことで起きやすい',
    action: '作業を「次の人に渡せる状態」まで分け、所要時間だけでなく確認・修正・連絡の余白も予定に入れる',
    practice: '今日の予定から一つ選び、開始条件と完了条件を一文で書いてから着手する',
    watch: '予定を詰めて達成感を作るより、遅れたときに戻せる余白を残した方が継続しやすい',
  }],
  [/会議|上司|部下|組織|根回し|共有|意思決定|合意|評価|成果/, {
    scene: '組織では、内容の正しさだけでは動かず、誰がいつ判断し、どの不安が残っているかが実行の速さを左右する',
    action: '会議の前に関係者ごとの懸念を集め、結論・根拠・依頼したい判断を分けて共有し、決まった後の担当も明確にする',
    practice: '次の報告で、冒頭に「今日決めたいこと」を置き、最後に担当者と期限を読み上げる',
    watch: '全員の納得を待ち続けると機会を逃すため、反対意見は記録しつつ決める基準を先に合意する',
  }],
  [/失敗|問題|ミス|危機|不安|恐れ|ストレス|焦り|回復|後悔/, {
    scene: '不安や失敗の直後は、目先の痛みを消すことが目的になり、状況を悪化させる判断を選びやすい',
    action: '起きた事実、今すぐ止めること、後で検討することを分け、感情が強い間は取り返しのつかない決定を保留する',
    practice: '困った出来事があったら、十分だけ使って事実と解釈を別の行に書き出す',
    watch: '一人で抱えるほど視野が狭くなるため、影響が大きい問題は早めに信頼できる人へ状況を共有する',
  }],
  [/学|成長|強み|能力|実績|経験|挑戦|準備|習慣|継続/, {
    scene: '成長は気合いの量より、試したことから何を残し、次に何を変えるかが見える状態で進む',
    action: '目標を小さく区切り、実行した量だけでなく、うまくいった条件と詰まった条件を短く記録して次に使う',
    practice: '一週間続ける行動を一つに絞り、終わった日に「続けやすくした条件」を一行残す',
    watch: '他人の速度を基準にすると試行が止まりやすいため、比較は行動量ではなく自分の変化を見るために使う',
  }],
  [/お金|資産|投資|損|リスク|将来|未来|選ぶ|決め|目標/, {
    scene: '長期の選択では、目の前の安心や損失への恐れが大きく見え、選ばなかった可能性まで含めて考えにくい',
    action: '望む結果、失っても耐えられる範囲、見直す時期を先に決め、情報が増えても判断基準を入れ替えすぎない',
    practice: '一つの選択について、続ける条件とやめる条件を紙に分けて書く',
    watch: '未来を完全に予測しようとすると動けなくなるため、取り返しのつく小さな決定から確かめる',
  }],
];

function chooseGuidance(title, field) {
  const fallback = fieldGuidance[field];
  const match = keywordGuidance.find(([pattern]) => pattern.test(title))?.[1] ?? {};
  return {
    ...fallback,
    ...match,
    scene: match.scene ?? fallback.defaultScene,
    action: match.action ?? fallback.defaultAction,
    practice: match.practice ?? fallback.defaultPractice,
    watch: match.watch ?? fallback.defaultWatch,
  };
}

function makeExplanation(item, field, persona, index) {
  const guide = chooseGuidance(item.title, field);
  const lead = `${item.title}が効くのは、${item.essence} ${guide.structure} ${guide.behaviour}`;
  const middle = `現実には、${guide.scene}。${guide.action}。その場をうまく収めることだけを狙うより、次に相手や自分が動きやすくなるかまで見ると、判断の精度が上がる。`;
  const ending = `使うときは、${guide.practice}。${guide.watch}。${persona}としての振る舞いを一度で完成させようとせず、反応を見て言い方・順番・距離を調整していくと、この処世術を自分の場面でも使いやすくなる。`;
  const explanation = `${lead}\n\n${middle}\n\n${ending}`;
  const length = [...explanation.replace(/\s/g, '')].length;
  if (length < 420 || length > 660) throw new Error(`Explanation length out of range (${length}): ${item.id}`);
  return explanation;
}

const cards = catalog.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items.map((item) => ({ item, category, persona }))));
if (cards.length !== 336) throw new Error(`Expected 336 techniques, got ${cards.length}`);

for (const [index, { item, category, persona }] of cards.entries()) {
  item.explanation = makeExplanation(item, category.key, persona.name, index);
}

fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
const all = cards.map(({ item }) => item.explanation);
console.log(JSON.stringify({
  techniques: all.length,
  minimum: Math.min(...all.map((value) => [...value.replace(/\s/g, '')].length)),
  maximum: Math.max(...all.map((value) => [...value.replace(/\s/g, '')].length)),
  average: Math.round(all.reduce((sum, value) => sum + [...value.replace(/\s/g, '')].length, 0) / all.length),
  duplicateExplanations: all.length - new Set(all).size,
}, null, 2));
