export type LearningChoice = {
  id: 'a' | 'b' | 'c';
  label: string;
};

export type LearningCase = {
  id: string;
  stage: 1 | 2 | 3;
  number: number;
  eyebrow: string;
  title: string;
  situation: string;
  question: string;
  choices: LearningChoice[];
  goodChoiceId: LearningChoice['id'];
  goodMove: string;
  why: string;
  caution: string;
  relatedCardIds: string[];
};

export type LearningStage = {
  number: 1 | 2 | 3;
  title: string;
  intro: string;
};

export const learningStages: LearningStage[] = [
  { number: 1, title: '空気、どうする？', intro: 'まずは、場に飲まれずに動けるか。' },
  { number: 2, title: 'それ、どう返す？', intro: '頼まれたとき、押されたときの一手。' },
  { number: 3, title: 'で、自分はどうする？', intro: '最後は、自分の人生を自分で選ぶ。' },
];

const rawLearningCases: LearningCase[] = [
  {
    id: 'case-01', stage: 1, number: 1, eyebrow: '飲み会の終盤', title: 'もう一杯、いく？',
    situation: '初対面の人もいる飲み会。会話は盛り上がり、「もう一杯どう？」と誘われた。明日は朝から予定がある。', question: 'どうする？',
    choices: [{ id: 'a', label: '空気を壊さないよう、もう一杯だけ残る' }, { id: 'b', label: '盛り上がっているうちに、明日の予定を添えて帰る' }, { id: 'c', label: '何も言わず、会計のタイミングで消える' }],
    goodChoiceId: 'b', goodMove: '印象が高いうちに、きれいに引く。', why: '楽しい時間の終わりは、次に会いたくなる余白になる。最後まで付き合うことより、別れ際の印象を整える方が、関係は長く残る。', caution: '毎回すぐ帰ると、距離を置かれているようにも映る。ここぞという日は残る余白も持つ。', relatedCardIds: ['complete-014', 'complete-013'],
  },
  {
    id: 'case-02', stage: 1, number: 2, eyebrow: '初対面の輪', title: '話、どう入る？',
    situation: '初めて参加した集まり。すでに仲の良さそうな人たちが話していて、会話の切れ目が見えない。', question: 'どう入る？',
    choices: [{ id: 'a', label: '自分の面白い経験を話して、印象を残す' }, { id: 'b', label: '最後の話題を拾って、ひとつ具体的に聞く' }, { id: 'c', label: '自然に話しかけられるまで、近くで待つ' }],
    goodChoiceId: 'b', goodMove: '会話の最後の言葉から、入る。', why: '輪に入る最短ルートは、新しい話題で奪うことではなく、今ある会話を少し前に進めること。相手の話を主役にすると、参加の違和感が消える。', caution: '質問だけを連発すると尋問になる。相手の答えを受けて、自分の小さな話も返す。', relatedCardIds: ['complete-025', 'complete-016'],
  },
  {
    id: 'case-03', stage: 1, number: 3, eyebrow: '落ち込む友人', title: '何て返す？',
    situation: '友人が仕事の失敗を話し始めた。かなり落ち込んでいるが、具体的に助けを求めているわけではない。', question: '何て返す？',
    choices: [{ id: 'a', label: 'すぐに解決策を三つ出す' }, { id: 'b', label: '「今日は聞くのと、一緒に考えるの、どっちがいい？」と聞く' }, { id: 'c', label: '自分のもっと大変だった話をして励ます' }],
    goodChoiceId: 'b', goodMove: '助け方を、先に聞く。', why: '正しい助言でも、相手が今ほしいのが理解なら届かない。共感か助言かを確かめるだけで、善意は相手の必要な形になる。', caution: '危険な状態や重大な誤解があるなら、確認だけで終わらせず必要な支援へつなぐ。', relatedCardIds: ['complete-024', 'complete-021'],
  },
  {
    id: 'case-04', stage: 1, number: 4, eyebrow: 'グループのノリ', title: '笑う？ 止める？',
    situation: '複数人の会話で、一人をからかう流れが強くなっている。自分は笑えば場に残れるが、少し嫌な感じもする。', question: 'どうする？',
    choices: [{ id: 'a', label: '自分も強めに笑って、場に合わせる' }, { id: 'b', label: '軽く話題を変え、本人にも話を振る' }, { id: 'c', label: '正論で全員を厳しく注意する' }],
    goodChoiceId: 'b', goodMove: '参加の意思は残し、傷つける流れから外す。', why: '集団では全面否定が反発を生むこともある。空気を壊さず、外れかけた人を会話へ戻す一手が、場の質を変える。', caution: '明確ないじめや危険があるときは、遠回しに処理せず、はっきり止めてよい。', relatedCardIds: ['complete-071', 'complete-067'],
  },
  {
    id: 'case-05', stage: 1, number: 5, eyebrow: '沈黙が来た', title: 'この間、埋める？',
    situation: '二人で話していたら、会話が数秒止まった。相手も飲み物を見ていて、何か考えているようだ。', question: 'どうする？',
    choices: [{ id: 'a', label: '焦って、関係ない質問を連発する' }, { id: 'b', label: '少し待ち、自然に次の話題へ移る' }, { id: 'c', label: '気まずくなったので、すぐスマホを見る' }],
    goodChoiceId: 'b', goodMove: '沈黙を、失敗にしない。', why: '気まずさを大きくするのは、沈黙そのものではなく、それを異常扱いして慌てる態度だ。間を普通に扱える余裕が、相手も楽にする。', caution: '相手が明らかに帰りたそうなら、沈黙を粘る理由にせず、場を終える判断も必要。', relatedCardIds: ['complete-027', 'complete-025'],
  },
  {
    id: 'case-06', stage: 1, number: 6, eyebrow: '誘いたい相手', title: '先に出る？',
    situation: 'また話したいと思う相手がいる。相手も楽しそうだったが、こちらから誘って迷惑がられるのは怖い。', question: 'どうする？',
    choices: [{ id: 'a', label: '相手から誘われるまで、何もしない' }, { id: 'b', label: '「また話したい。今度ごはんどう？」と小さく誘う' }, { id: 'c', label: '長文で気持ちを全部伝える' }],
    goodChoiceId: 'b', goodMove: '失っても困らない好意を、先に置く。', why: '好意は心の中にあるだけでは、相手の判断材料にならない。小さく示せば、相手も一歩を返すか選べる。', caution: '返答を急かさない。好意は交換条件ではなく、相手に自由を残すもの。', relatedCardIds: ['complete-028', 'complete-017'],
  },
  {
    id: 'case-07', stage: 1, number: 7, eyebrow: '頼られたとき', title: 'これ、引き受ける？',
    situation: '友人から週末の手伝いを頼まれた。悪い人ではないが、今週は自分にも外せない予定がある。', question: 'どう返す？',
    choices: [{ id: 'a', label: '断りづらいので、予定を削って引き受ける' }, { id: 'b', label: 'できないことを早く伝え、可能なら別の手段を添える' }, { id: 'c', label: '返事を先延ばしにして、相手が諦めるのを待つ' }],
    goodChoiceId: 'b', goodMove: '早く、はっきり返す。', why: '曖昧な保留は、相手の代替案を探す時間まで奪う。早い「できない」は冷たさではなく、相手が次へ動ける返事になる。', caution: '何でも断るのではなく、引き受けられる範囲と代案があれば一緒に示す。', relatedCardIds: ['complete-048', 'complete-082'],
  },
  {
    id: 'case-08', stage: 2, number: 8, eyebrow: '追加依頼、きた。', title: 'どっちを先にやる？',
    situation: '締切が近い資料を作っている最中、上司から「これも今日中にお願い」と別件を頼まれた。', question: 'どう返す？',
    choices: [{ id: 'a', label: '両方引き受け、残業して終える' }, { id: 'b', label: '今の資料と新しい依頼の、優先順位を確認する' }, { id: 'c', label: '今の仕事を理由に、新しい依頼を断る' }],
    goodChoiceId: 'b', goodMove: '優先順位を、依頼者へ返す。', why: '抱え込む前に全体の優先順位を確認すれば、仕事の衝突を自分一人の努力で埋めずに済む。判断の材料を持って聞くことも、仕事の一部だ。', caution: '丸投げに見えないよう、「こちらは明日でも問題ありません」のような自分の見立ても添える。', relatedCardIds: ['complete-102', 'complete-157'],
  },
  {
    id: 'case-09', stage: 2, number: 9, eyebrow: '無茶な締切', title: '無理です、で終わる？',
    situation: '取引先から、品質を落とさなければ間に合わない納期を求められた。相手は「何とかして」と急かしている。', question: 'どう返す？',
    choices: [{ id: 'a', label: 'とにかく無理と言って、断る' }, { id: 'b', label: '品質・納期・範囲のうち、何を動かせるか選択肢を示す' }, { id: 'c', label: '相手の言う通りに受け、後で何とかする' }],
    goodChoiceId: 'b', goodMove: '問題だけでなく、選択肢まで返す。', why: '無理な要求に対して、ただ断るか従うかの二択に入る必要はない。動かせる条件を分け、相手に選んでもらえば交渉が始まる。', caution: '約束できない品質や期限を、選択肢に混ぜない。守れる線は先に固定する。', relatedCardIds: ['complete-102', 'complete-126'],
  },
  {
    id: 'case-10', stage: 2, number: 10, eyebrow: '見えない仕事', title: '黙っていれば伝わる？',
    situation: '他部署との調整やトラブル対応を多く担っている。しかし成果物を出す人ほど目立ち、自分の貢献は伝わりにくい。', question: 'どうする？',
    choices: [{ id: 'a', label: '見てくれる人は見ている、と何も言わない' }, { id: 'b', label: '定例で、調整した論点・決まったこと・防げた問題を短く共有する' }, { id: 'c', label: '不満を同僚にだけ話す' }],
    goodChoiceId: 'b', goodMove: '見えない仕事を、判断と効果で残す。', why: '評価されるのは、作業量ではなく組織に起きた変化だ。自慢ではなく、判断・調整・防いだ損失を短く可視化する。', caution: '細かい苦労話を並べると、成果ではなく愚痴に見える。相手が判断できる情報だけを残す。', relatedCardIds: ['complete-110', 'complete-109'],
  },
  {
    id: 'case-11', stage: 2, number: 11, eyebrow: '押しの強い相手', title: 'その場で決める？',
    situation: '商談で、相手から「今日決めてもらえれば特別条件にします」と急かされた。条件は悪くないが、比較する時間がない。', question: 'どうする？',
    choices: [{ id: 'a', label: 'チャンスを逃したくないので、その場で決める' }, { id: 'b', label: '判断期限と、持ち帰って確認する項目を明確にする' }, { id: 'c', label: '相手が嫌なので、すぐ交渉を打ち切る' }],
    goodChoiceId: 'b', goodMove: '急かされても、撤回できる余地を残す。', why: '不確実な場面で強いのは、正解を当てる人ではなく、外れても戻れる選択を持つ人だ。期限と確認項目を切り分ける。', caution: '期限を無視し続けるのではなく、いつまでに何を返すかをこちらから約束する。', relatedCardIds: ['complete-172', 'complete-119'],
  },
  {
    id: 'case-12', stage: 2, number: 12, eyebrow: '意見が割れた', title: '正論で押し切る？',
    situation: '会議で、提案内容は明らかに合理的だと思う。しかし反対している人にも、立場上の事情がありそうだ。', question: 'どうする？',
    choices: [{ id: 'a', label: '正しい根拠を重ねて、反対を論破する' }, { id: 'b', label: '反対の裏にある損失を聞き、相手が負けない形を探す' }, { id: 'c', label: '面倒なので提案を引っ込める' }],
    goodChoiceId: 'b', goodMove: '正しさの前に、失いたくないものを聞く。', why: '反対意見の奥には、失う権限・予算・面子などの事情がある。そこを扱わずに正論だけを通すと、決まっても動かない。', caution: '相手の事情に配慮しても、目的まで曖昧にしない。譲れない条件は残す。', relatedCardIds: ['complete-134', 'complete-141'],
  },
  {
    id: 'case-13', stage: 2, number: 13, eyebrow: 'また頼まれた', title: '今回も、譲る？',
    situation: 'いつも自分だけが面倒な役を引き受けている。今回も「君の方が早いから」と頼まれた。', question: 'どう返す？',
    choices: [{ id: 'a', label: '早く終わるので、今回も黙って引き受ける' }, { id: 'b', label: '引き受ける条件や、次回の分担を具体的に決める' }, { id: 'c', label: '過去の不満を全部ぶつけて、強く断る' }],
    goodChoiceId: 'b', goodMove: '善意を、無条件の前例にしない。', why: '繰り返した譲歩は、やがて相手の期待になる。協力するなら、役割や次回の返し方まで言葉にして、関係の形を整える。', caution: '一度のお願いまで敵意として扱わない。問題は、負担の偏りが固定されていること。', relatedCardIds: ['complete-050', 'complete-038'],
  },
  {
    id: 'case-14', stage: 2, number: 14, eyebrow: '断った後', title: '罪悪感、どうする？',
    situation: '無理な頼みを断った。相手は少し残念そうで、自分が悪いことをしたような気がしている。', question: 'どうする？',
    choices: [{ id: 'a', label: '罪悪感を消すため、やっぱり引き受ける' }, { id: 'b', label: '約束・責任・相手への損害を分けて、判断を見直す' }, { id: 'c', label: '相手が悪いと決めつけて、完全に切る' }],
    goodChoiceId: 'b', goodMove: '罪悪感と、責任を分ける。', why: '断った後の痛みは、義務がある証拠とは限らない。事実として果たすべき責任かを見直せば、感情に押されて境界を手放さずに済む。', caution: '実際に約束を破ったなら、罪悪感は修正のための情報になる。都合のいい言い訳にしない。', relatedCardIds: ['complete-044', 'complete-048'],
  },
  {
    id: 'case-15', stage: 3, number: 15, eyebrow: '条件のいい内定', title: 'でも、何か違う。',
    situation: '周囲からは羨ましがられる内定をもらった。でも、数年後にやりたいことへつながる実感が薄い。', question: 'どう決める？',
    choices: [{ id: 'a', label: '周りが褒めるので、そのまま決める' }, { id: 'b', label: '肩書と、そこで持ち運べる能力を分けて考える' }, { id: 'c', label: '不安なので、どちらも決めずに保留する' }],
    goodChoiceId: 'b', goodMove: '肩書より、持ち運べる力を見る。', why: '一つの選択を、世間の評価だけで測ると判断を預けることになる。次の場所でも使える力と、自分が成したいことを並べて考える。', caution: '肩書を無価値と決めつける必要はない。そこで得られる人・経験・選択肢も、具体的に数える。', relatedCardIds: ['complete-169', 'complete-178'],
  },
  {
    id: 'case-16', stage: 3, number: 16, eyebrow: '大事な選考', title: '落ちた。終わった？',
    situation: '長く目指してきた選考に落ちた。予定していた道が消え、ここまで費やした時間まで無駄に思える。', question: 'まず何をする？',
    choices: [{ id: 'a', label: '自分には価値がない、と結論づける' }, { id: 'b', label: '失った道と、そこまでで得た力を分けて書き出す' }, { id: 'c', label: '空白が怖いので、すぐ似た目標を決める' }],
    goodChoiceId: 'b', goodMove: '失った道と、歩いた力を分ける。', why: '目的地が閉じても、そこまで歩く中で得た知識・判断力・耐性まで失われるわけではない。持ち運べるものを見つけると、次の選択が始まる。', caution: 'すぐ前向きになろうとしない。悲しむ時間と、生活を戻す時間の両方が必要。', relatedCardIds: ['complete-207', 'complete-208'],
  },
  {
    id: 'case-17', stage: 3, number: 17, eyebrow: 'SNSの夜', title: '置いていかれる。',
    situation: '同年代の知人が昇進・留学・起業した投稿を見た。自分だけ遅れているように感じる。', question: 'どうする？',
    choices: [{ id: 'a', label: '足りないものを数え続ける' }, { id: 'b', label: '羨ましさから自分の欲望を読み、今週の一歩に戻す' }, { id: 'c', label: '焦りを消すため、大きな決断をする' }],
    goodChoiceId: 'b', goodMove: '比較を、次の一手へ変える。', why: '他人の成果は、自分の敗北ではない。羨ましさは、何をほしいのかを教える情報にはなる。人生の採点表にせず、動かせる行動へ戻す。', caution: 'SNSを見続けて消耗するなら、情報から離れる時間をつくる。比較の材料は適量でいい。', relatedCardIds: ['complete-179', 'complete-187'],
  },
  {
    id: 'case-18', stage: 3, number: 18, eyebrow: '選ばなかった道', title: 'あっちなら、もっと。',
    situation: '別の進路を選んでいれば、今よりうまくいっていた気がする。思い返すほど、その道が完璧に見える。', question: 'どう考える？',
    choices: [{ id: 'a', label: '今の人生を責め続ける' }, { id: 'b', label: '選ばなかった道の費用も書き、今ほしい要素を小さく取り入れる' }, { id: 'c', label: '後悔を消すため、今すぐ全てをやり直す' }],
    goodChoiceId: 'b', goodMove: '予告編ではなく、現実同士を比べる。', why: '選ばなかった人生は、失敗や退屈が編集で消えた予告編になりやすい。羨んだ要素だけを今の人生へ少し足す方が、現実を動かせる。', caution: '後悔を無理に否定しない。それは、自分が大切にしたい価値の手がかりにもなる。', relatedCardIds: ['complete-209', 'complete-177'],
  },
  {
    id: 'case-19', stage: 3, number: 19, eyebrow: '動けない日', title: '不安が消えてから？',
    situation: '新しいことを始めたい。でも失敗が怖く、準備が足りない気がして手をつけられない。', question: 'どうする？',
    choices: [{ id: 'a', label: '不安が完全に消えるまで待つ' }, { id: 'b', label: '失っても困らない小さな単位で、先に動く' }, { id: 'c', label: '勢いで大きく賭けて、後戻りできなくする' }],
    goodChoiceId: 'b', goodMove: '不安を連れたまま、小さく動く。', why: '不安は、行動前に消えるとは限らない。小さく試せば、失敗を致命傷にせず、現実の情報で次の判断を更新できる。', caution: '小さく始めることを、永遠に準備だけする言い訳にしない。試す期限は決める。', relatedCardIds: ['complete-204', 'complete-174'],
  },
  {
    id: 'case-20', stage: 3, number: 20, eyebrow: '予定どおりの休日', title: '効率だけで決める？',
    situation: '予定は完璧に埋まっている。でも、少し寄りたい展示や会いたい人がいる。行けば計画は崩れる。', question: 'どうする？',
    choices: [{ id: 'a', label: '予定を守るため、寄り道は全部切る' }, { id: 'b', label: '大事な予定は守りつつ、余白の一部を寄り道に使う' }, { id: 'c', label: '予定を全部捨てて、その場の気分だけで動く' }],
    goodChoiceId: 'b', goodMove: '余白に、偶然の入口を残す。', why: '効率だけで道を選ぶと、計画に入らない出会い・景色・経験を取りこぼす。人生を濃くするものの一部は、予定外から来る。', caution: '締切や約束まで崩す必要はない。寄り道のための余白を、最初から少し確保する。', relatedCardIds: ['complete-164', 'complete-173'],
  },
  {
    id: 'case-21', stage: 3, number: 21, eyebrow: '人生の岐路', title: '正解、当てにいく？',
    situation: '先の見えない選択を迫られている。どちらも魅力があり、失敗しない答えを探すほど決められない。', question: 'どう決める？',
    choices: [{ id: 'a', label: '一番確実な正解が見つかるまで止まる' }, { id: 'b', label: '後から修正できるかを基準に、まず一つ選ぶ' }, { id: 'c', label: '誰かが決めてくれるまで待つ' }],
    goodChoiceId: 'b', goodMove: '正解より、戻れる選択を持つ。', why: '未来が読めないとき、最初から最適解を当てるより、外れたときに立て直せる選択の方が強い。判断は一度きりの試験ではない。', caution: '撤回可能性だけを理由に、大切な挑戦から逃げない。失うものと得るものは、正面から数える。', relatedCardIds: ['complete-172', 'complete-195'],
  },
];

// 選択肢の内容は変えず、答えの位置だけを散らす。
// 「Bを選べるか」の暗記ゲームにしないため、各位置が7問ずつになるようにしている。
const preferredPositions: Record<string, LearningChoice['id']> = {
  'case-01': 'b', 'case-02': 'a', 'case-03': 'c', 'case-04': 'a', 'case-05': 'c', 'case-06': 'b', 'case-07': 'a',
  'case-08': 'c', 'case-09': 'b', 'case-10': 'a', 'case-11': 'c', 'case-12': 'b', 'case-13': 'a', 'case-14': 'c',
  'case-15': 'b', 'case-16': 'a', 'case-17': 'c', 'case-18': 'b', 'case-19': 'a', 'case-20': 'c', 'case-21': 'b',
};

export const learningCases: LearningCase[] = rawLearningCases.map((item) => {
  const target = preferredPositions[item.id];
  const original = item.goodChoiceId;
  if (target === original) return item;

  return {
    ...item,
    goodChoiceId: target,
    choices: item.choices.map((choice) => {
      if (choice.id === original) return { ...choice, id: target };
      if (choice.id === target) return { ...choice, id: original };
      return choice;
    }),
  };
});

export type LearningChoiceReview = {
  isPreferred: boolean;
  label: string;
  text: string;
};

// The feedback is keyed by the wording instead of A/B/C because the preferred
// position is deliberately shuffled above.
const alternativeReviews: Record<string, string> = {
  'case-01|空気を壊さないよう、もう一杯だけ残る': '場に合わせる気遣いはある。ただ、翌日の予定まで削ると、好印象を残すより無理を重ねる形になりやすい。',
  'case-01|何も言わず、会計のタイミングで消える': '早く切り上げられるが、無言で消えると関係を閉じた印象だけが残りやすい。',
  'case-02|自分の面白い経験を話して、印象を残す': '印象を残そうとする熱量は悪くない。ただ、会話を奪う入り方は、すでにある輪では浮きやすい。',
  'case-02|自然に話しかけられるまで、近くで待つ': '待てば摩擦はないが、会話に入れてもらう役を相手に任せ続けることになる。',
  'case-03|すぐに解決策を三つ出す': '解決に向かわせたい善意はある。ただ、求めていない助言は、理解されなかった感覚を残しやすい。',
  'case-03|自分のもっと大変だった話をして励ます': '励ますつもりでも、話題が自分へ移ると相手の痛みが小さく扱われたように聞こえる。',
  'case-04|自分も強めに笑って、場に合わせる': 'その場に残るには楽だが、笑いに加わるほど相手を孤立させる側にも回る。',
  'case-04|正論で全員を厳しく注意する': '止めたい意志は大切。ただ、全員を断罪すると防御反応が強まり、場を立て直しにくい。',
  'case-05|焦って、関係ない質問を連発する': '場をつなごうとする気遣いはある。ただ、質問を重ねるほど沈黙を「失敗」として固定してしまう。',
  'case-05|気まずくなったので、すぐスマホを見る': '逃げ道にはなるが、相手には会話を閉じたサインとして伝わりやすい。',
  'case-06|相手から誘われるまで、何もしない': '相手を尊重しているようで、実際は判断材料を一つも渡していない。',
  'case-06|長文で気持ちを全部伝える': '好意は伝わるが、一度に重く渡すと相手の返事の自由を狭めてしまう。',
  'case-07|断りづらいので、予定を削って引き受ける': '助けられるが、自分の外せない予定まで崩すと、善意が無理の前例になる。',
  'case-07|返事を先延ばしにして、相手が諦めるのを待つ': '衝突は避けられるようで、相手の代案を探す時間を奪ってしまう。',
  'case-08|両方引き受け、残業して終える': '頑張りは評価されても、どちらかの品質や期限が落ちたときに優先順位の責任まで抱える。',
  'case-08|今の仕事を理由に、新しい依頼を断る': '今の仕事を守れるが、依頼の目的や緊急度を確かめずに可能性を閉じてしまう。',
  'case-09|とにかく無理と言って、断る': '守る線を示せる点はよい。ただ、代替案がない断り方では交渉がそこで止まる。',
  'case-09|相手の言う通りに受け、後で何とかする': '関係は保てるが、後で品質・信頼・負荷のどれかにツケが回る。',
  'case-10|見てくれる人は見ている、と何も言わない': '控えめではいられるが、見えない仕事は、見える形にしなければ判断材料にならない。',
  'case-10|不満を同僚にだけ話す': '共感は得られても、評価を変える情報は意思決定者に届かない。',
  'case-11|チャンスを逃したくないので、その場で決める': '決断の速さはあるが、比較できない条件をその場の熱量で引き受けることになる。',
  'case-11|相手が嫌なので、すぐ交渉を打ち切る': '圧に流されない姿勢は大事。ただ、即座に切ると本当に必要な条件まで見失う。',
  'case-12|正しい根拠を重ねて、反対を論破する': '根拠は強くても、相手が守りたいものを扱わなければ、合意後に協力を得られない。',
  'case-12|面倒なので提案を引っ込める': '衝突は避けられるが、必要な提案まで引っ込めると目的を守れない。',
  'case-13|早く終わるので、今回も黙って引き受ける': '短期的には早い。ただ、無条件に引き受けるほど負担の偏りが標準になっていく。',
  'case-13|過去の不満を全部ぶつけて、強く断る': '境界を守ろうとする意図はあるが、過去の不満を一度にぶつけると話し合いが壊れやすい。',
  'case-14|罪悪感を消すため、やっぱり引き受ける': '関係を守りたい気持ちは分かる。ただ、感情だけで約束を覆すと次も断れなくなる。',
  'case-14|相手が悪いと決めつけて、完全に切る': '自分を守るためでも、相手を悪者に固定すると必要な責任確認まで避けてしまう。',
  'case-15|周りが褒めるので、そのまま決める': '周囲の評価は重要な情報の一つ。ただ、それだけで決めると自分が得たい力が置き去りになる。',
  'case-15|不安なので、どちらも決めずに保留する': '慎重さはあるが、保留を続けるだけでは比較に必要な情報も増えない。',
  'case-16|自分には価値がない、と結論づける': '痛みを自分全体の価値に広げると、次へ持ち運べる力まで見えなくなる。',
  'case-16|空白が怖いので、すぐ似た目標を決める': '早く立て直したい気持ちは分かる。ただ、似た目標を急いで置くと失ったものの整理ができない。',
  'case-17|足りないものを数え続ける': '現状を見直すきっかけにはなるが、欠けているものだけ数えると動く力が削られる。',
  'case-17|焦りを消すため、大きな決断をする': '変えようとする熱量はある。ただ、焦りだけで大きく賭けると望みと違う選択になりやすい。',
  'case-18|今の人生を責め続ける': '後悔を大切にすることと、今の人生を責め続けることは別だ。',
  'case-18|後悔を消すため、今すぐ全てをやり直す': '変えたい意志はある。ただ、理想化された過去を基準に全てを壊すと、同じ後悔を繰り返しやすい。',
  'case-19|不安が完全に消えるまで待つ': '慎重さは役立つが、不安が完全に消えるのを待つほど、始める材料は増えにくい。',
  'case-19|勢いで大きく賭けて、後戻りできなくする': '覚悟は作れるが、後戻りできなくする必要はない。まずは小さく確かめられる。',
  'case-20|予定を守るため、寄り道は全部切る': '約束を守る姿勢は大切。ただ、余白まで消すと、計画外の大事なものに触れる機会も失う。',
  'case-20|予定を全部捨てて、その場の気分だけで動く': '自由は得られるが、全部を気分に委ねると守るべき約束まで崩れやすい。',
  'case-21|一番確実な正解が見つかるまで止まる': '慎重さはあるが、確実な正解を待つ間に、選択そのものができなくなる。',
  'case-21|誰かが決めてくれるまで待つ': '責任を軽くできるようで、自分が何を選びたいかを決める機会まで渡してしまう。',
};

export function getChoiceReview(item: LearningCase, choice: LearningChoice): LearningChoiceReview {
  const isPreferred = choice.id === item.goodChoiceId;
  return {
    isPreferred,
    label: isPreferred ? 'よりよい一手' : '選べるが、今回は惜しい手',
    text: isPreferred
      ? item.why
      : alternativeReviews[`${item.id}|${choice.label}`] ?? 'この手にも意図はある。ただ、今回の局面では状況を前に進める力が弱い。',
  };
}

export function getLearningCase(id: string) {
  return learningCases.find((item) => item.id === id);
}
