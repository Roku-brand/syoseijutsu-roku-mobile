import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generated = path.join(root, 'src', 'data', 'generated');
const readJson = async (name) => JSON.parse(await fs.readFile(path.join(generated, name), 'utf8'));
const writeJson = async (name, value) => fs.writeFile(path.join(generated, name), `${JSON.stringify(value, null, 2)}\n`);

const personaName = '一緒にいて疲れない人';
const items = [
  {
    id: 'master336-337', title: '相手の話を自分の話で上書きしない',
    essence: '共感のつもりでも、毎回自分の話に置き換えると相手は話す気を失う。',
    explanation: '似た経験を返すこと自体は共感になり得る。しかし、相手が話し終える前に「私も」と主語を奪い、そのまま自分の体験を長く語ると、相手の出来事は自分語りの入口として扱われる。相手は聞いてもらうために話したのに、今度は聞き役と反応役を担わされるため、理解されなかった寂しさと感情労働が同時に残る。\n友人が仕事の失敗を話したときは、似た失敗をすぐ披露するより、「それは焦るよね」「その後どうなった？」と相手の話を一段深くする。自分の経験が役立ちそうなら、「似たことがあったけど、聞く？」と許可を取り、短く話した後で相手へ主語を返す。経験の類似より、いま誰の話をしているかを守る方が共感は伝わる。\n自分の話を一切しない必要はない。自己開示の往復は親しさをつくるが、相手の話を受け止める前に交代すると、会話の中心を競う形になる。まず内容や感情を言い換えて理解を確かめ、相手が話し切った合図を待つ。自分の体験は相手の理解を助ける分だけに留め、最後は質問や一言で相手へ戻す。',
    importance: 3, relatedTheoryIds: ['kb_412', 'kb_413'], primaryTheoryIds: ['kb_412'],
    todayActions: ['相手の話に、まず一度だけ要約か感情の言葉を返す。', '自分の経験を話す前に「似た話をしてもいい？」と聞く。'],
    caution: '自分の話を禁じるのではなく、相手が話し切る前に主語を奪わない。',
  },
  {
    id: 'master336-338', title: '勝てる話でも勝ちにいかない',
    essence: '会話で優位を示すほど、相手には比較された感覚が残る。',
    explanation: '知識、収入、経験、人脈などで自分が上だと示せる場面はある。そこで訂正や追加情報を重ねて勝つと、事実上は正しくても、会話の目的が交流から順位決めへ変わる。相手は内容を楽しむ代わりに、自分の不足を見せないよう発言を選び、次の反論に備える。小さな優越の積み重ねが、対等に話せない警戒と比較疲れを残す。\n相手が「最近五キロ走れるようになった」と喜んでいるとき、自分の十キロ記録や速い友人の話を足す必要はない。「続けたのがすごいね」と、その人の変化の中で受け取る。誤情報を直す必要がある場合も、「正確にはこうらしいよ」と論点だけを整え、自分の知識量や経歴まで証拠として並べない。勝てる材料と、いま使うべき材料は別である。\n譲ることは、意見を隠したり事実を曲げたりすることではない。安全や重要な判断に関わる誤りは伝えてよいが、相手より上に立つことが目的へ混ざっていないかを確かめる。会話の後に相手が情報だけでなく尊厳も持ち帰れる形を選ぶ。正しさを共有財産にできれば、知識差は上下関係に変わらない。',
    importance: 3, relatedTheoryIds: ['kb_266', 'kb_055'], primaryTheoryIds: ['kb_266'],
    todayActions: ['相手の報告に、自分の上位実績を足さず一度祝う。', '訂正するときは論点だけを短く伝え、経歴を並べない。'],
    caution: '安全や重大な判断に関わる誤りまで放置するという意味ではない。',
  },
  {
    id: 'master336-339', title: '褒められたら否定せず受け取る',
    essence: '褒め言葉を反射的に否定すると、相手にもう一度肯定する役割を負わせる。',
    explanation: '「そんなことない」と謙遜するつもりでも、褒めた側には、自分の観察や好意を否定された形が残る。さらに相手は「本当にそう思うよ」と根拠を足し、落ち込んだこちらを励ます役まで引き受けやすい。褒め言葉のたびにこの往復が起きると、好意を渡した人が自己評価を修復する係になり、短い会話にも余分な感情労働が生まれる。\n「その服似合うね」と言われたら、「ありがとう、気に入っているんだ」で十分である。仕事を褒められたときも、「まだまだです」と打ち消す代わりに、「見てくれてありがとう。そこは時間をかけた」と受け取る。照れがあるなら「うれしい、少し照れる」と感情を添えればよく、自分の欠点を持ち出して相手に再評価を求めなくてよい。\n受け取ることは、自分を大きく見せることでも、評価に全面同意することでもない。相手が差し出した好意を、訂正せずに着地させる行為である。共同の成果なら関係者の貢献を添えてよいが、それも自分への言葉を消した後ではなく、まず感謝してから行う。好意が一往復で完了すると、相手は安心してまた言葉を渡せる。',
    importance: 2, relatedTheoryIds: ['kb_479', 'kb_047'], primaryTheoryIds: ['kb_479'],
    todayActions: ['褒められたら最初の一言を「ありがとう」にする。', '否定したくなったら、代わりに工夫した点を一つ添える。'],
    caution: '共同成果では感謝の後に他の人の貢献も正しく伝える。',
  },
  {
    id: 'master336-340', title: '自慢話は短く終える',
    essence: 'うれしい報告でも、実績や周囲の評価を重ねるほど相手に称賛役を求める形になる。',
    explanation: '達成を共有することは自然だが、数字、肩書、周囲の反応を次々に足すと、相手には適切な称賛を出し続ける役割が生まれる。話を止めれば嫉妬と思われそうで、薄い反応ならさらに説明されそうだと感じるため、聞き手は本音より安全な相づちを選ぶ。喜びの共有が一方向の自己呈示になると、比較と反応管理の疲れを残す。\n昇進や受賞を話すなら、「うれしかった。手伝ってくれた人にも感謝している」までで一度止める。相手が詳しく聞けば背景を話し、そうでなければ「最近そっちはどう？」と会話を戻す。SNSの反応や他人からの絶賛を証拠として何度も足さなくても、うれしいという事実は伝わる。短さは成果を隠すためではなく、称賛の量を相手に要求しないためにある。\n実績を正確に説明すべき面接や報告の場と、友人との日常会話は分ける。日常では、何を達成したかより、なぜうれしかったかを一つ話す方が共感につながる。相手の表情や質問が細くなったら情報を追加せず、話題を開く。自慢をゼロにするのではなく、相手が観客に固定される前に終えられることが大切である。',
    importance: 2, relatedTheoryIds: ['kb_112', 'kb_266', 'kb_481'], primaryTheoryIds: ['kb_112'],
    todayActions: ['うれしい報告は、実績と感情を一つずつ伝えて止める。', '相手から質問がなければ、自分から話題を相手へ返す。'],
    caution: '面接や業務報告など、実績の詳しい説明が必要な場面とは分ける。',
  },
  {
    id: 'master336-341', title: '相手の成功に水を差さない',
    essence: '喜んでいる相手に欠点や現実論を足すと、祝福ではなく採点になる。',
    explanation: '良い知らせを話す人は、分析会議より喜びの共有を求めていることが多い。そこで「でも忙しくなるよ」「もっと上もいる」と欠点を足すと、相手は喜んだ自分が浅かったかのように感じる。感情を引っ込め、こちらの前では浮かれすぎないよう自己監視を始めるため、祝ってほしかった会話が評価者への報告に変わる。\n友人が転職の内定を喜んでいるなら、まず「おめでとう。頑張っていたものね」と一緒に喜ぶ。条件上の心配が本当にある場合も、その瞬間に差し込まず、「落ち着いたら条件も一緒に確認する？」と別の時間へ分ける。成功を祝う局面とリスクを検討する局面を混ぜないだけで、相手は喜びを守ったまま現実も考えられる。\n無条件に賛成し、危険を見ないふりをする必要はない。違いは、相手の感情を受け取る前に採点を始めないことにある。良い報告には関心を示し、工夫や努力を具体的に尋ねる。必要な助言は許可とタイミングを選ぶ。祝福を先に完了させれば、現実的な話も対立ではなく支援として届きやすい。',
    importance: 3, relatedTheoryIds: ['kb_024', 'kb_418'], primaryTheoryIds: ['kb_024'],
    todayActions: ['良い報告には、最初に祝福と具体的な関心を返す。', '懸念があるときは「今話す？後で考える？」と時機を選んでもらう。'],
    caution: '重大な危険が迫る場合は、祝福だけで済ませず必要な情報を伝える。',
  },
  {
    id: 'master336-342', title: '知らないことを馬鹿にしない',
    essence: '知識差を優劣に変えると、相手は質問も発言もしづらくなる。',
    explanation: '「そんなことも知らないの」という反応は、一つの知識不足を人全体の能力評価へ広げる。相手は答えを得る前に恥を処理し、次からは分からないことを隠すようになる。冗談の形でも、質問すれば地位を下げられるという学習が残るため、会話の安全性が失われ、互いに確かめられるはずの情報まで閉じていく。\n相手が基本的な用語を知らなければ、「これはこういう意味だよ」と説明し、どこから知りたいかを聞く。「常識」「普通は知っている」を前置きにしない。自分が詳しい理由も、仕事や趣味で触れる機会が多かったからだと文脈に戻せば、知識差を才能や格の差にしなくて済む。質問への第一反応を穏やかにするだけで、相手は会話へ残れる。\n説明する側が何でも教える義務を負うわけではない。時間がなければ資料を示したり、後で話すと伝えたりしてよい。大切なのは、知らないことを境界設定の理由にはしても、侮辱の材料にしないことだ。質問しても尊厳を失わない関係では、誤解が早く見つかり、こちらも知らないと言いやすくなる。',
    importance: 3, relatedTheoryIds: ['kb_402', 'kb_055'], primaryTheoryIds: ['kb_402'],
    todayActions: ['質問への最初の返答から「常識」「普通は」を外す。', '知識差を、能力差ではなく触れた機会の差として説明する。'],
    caution: '説明する時間がないときは、相手を下げずに範囲や時機を伝える。',
  },
  {
    id: 'master336-343', title: '相手の選択を採点しない',
    essence: '恋愛・仕事・服・趣味まで評価すると、会話が交流ではなく審査になる。',
    explanation: '「それは正解」「その服はなし」のように、頼まれていない選択まで点数化すると、こちらが基準を持つ審査員になる。相手は自分の好みや事情を話す代わりに、こちらの合格条件を推測し始める。親しさの中で評価が続くほど、自分で選ぶ感覚と自然な自己開示が削られ、会うたびに失点を避ける心理的負担が増える。\n友人が新しい趣味や服を見せたら、「自分なら選ばない」ではなく、「どこが気に入ったの？」と本人の基準を聞く。意見を求められた場合も、「私の好みではこちら。ただ、あなたが重視しているのは何？」と主語を限定する。選択の背景を知る前に結論を置かないだけで、会話は採点から理解へ戻る。\n健康、安全、金銭など重大な影響がある選択では、懸念を伝える必要もある。ただし人格やセンスの判定にせず、観察できる事実と自分の心配を分ける。相手の決定権まで奪わず、助言が必要かを確かめる。意見を持つことと、関係の中で常に採点権を持つことは別である。',
    importance: 3, relatedTheoryIds: ['kb_436', 'kb_050', 'kb_403'], primaryTheoryIds: ['kb_436'],
    todayActions: ['相手の選択を聞いたら、評価より先に理由を一つ尋ねる。', '意見を言うときは「私の好みでは」と主語を限定する。'],
    caution: '安全や大きな損失に関わる懸念は、事実と心配を分けて伝える。',
  },
  {
    id: 'master336-344', title: '「だから言った」を言わない',
    essence: '失敗した相手への結果論は、助言よりも自分の正しさの証明として伝わりやすい。',
    explanation: '結果が出た後は、以前の助言が明白な正解だったように見えやすい。「だから言った」は問題の解決より、こちらが正しく相手が間違っていたという順位を確定する言葉になる。すでに損失や後悔を抱える相手へ、恥と謝罪の処理まで追加するため、相談しても弱みを使われるという警戒が残る。\n友人が心配していた選択で失敗したら、「今いちばん困っているのは何？」と現在へ焦点を移す。以前の助言を確認する必要がある場合も、「次はどの兆候を見たら止まれそう？」と再発防止の条件へ変換する。過去の発言記録を証拠として突きつけず、相手が次に使える情報だけを残す。\n自分の助言が繰り返し無視され、後始末だけ求められるなら、支援の範囲に境界線を引いてよい。正しさを示さないことは、無制限に救済することではない。「今回はここまでなら手伝える」と責任を分ける。失敗直後に勝敗を決めず、学習と負担の分担を別々に扱う方が関係を対等に保てる。',
    importance: 2, relatedTheoryIds: ['kb_396', 'kb_055', 'kb_427'], primaryTheoryIds: ['kb_396'],
    todayActions: ['失敗の報告には、過去の助言ではなく現在の困り事を聞く。', '再発防止は「次に見る兆候」という未来の言葉で話す。'],
    caution: '後始末を当然に引き受けず、手伝える範囲は明確にする。',
  },
  {
    id: 'master336-345', title: '愚痴の聞き役を固定しない',
    essence: '同じ相手に感情処理を任せ続けると、友情が感情労働に変わる。',
    explanation: '話を聞いてもらうことは支えになるが、毎回同じ人を受け皿にすると役割が固定される。聞き手は自分が疲れていても機嫌を整え、共感し、言葉を選び、会話を安全に終える仕事を担う。断れば冷たい人になる不安まで生じるため、表面上は応じていても、友情の中に一方的な感情労働と義務感が蓄積する。\n重い話を始める前に、「十分だけ聞ける？今日は無理なら大丈夫」と受け取れる状態を確認する。家族、別の友人、相談窓口、ノートなど、話す先と処理方法を一つに集中させない。聞いてもらった後は相手の近況も尋ね、次回は楽しい話や共同の時間をつくる。支えを分散することは、関係を薄くするのではなく守る工夫である。\n支え合いを毎回同じ量で返す必要はなく、つらい時期に偏ることもある。ただし、相手の同意と余力を確認せず恒常的な役割にしない。専門的な支援が必要な状態を友人一人で抱えないことも大切である。好意で聞いてくれる人ほど限界を言いにくいと考え、断れる出口をこちらから用意する。',
    importance: 3, relatedTheoryIds: ['kb_398', 'kb_030', 'kb_431'], primaryTheoryIds: ['kb_398'],
    todayActions: ['重い話の前に、時間と聞ける余力を確認する。', '感情を整理する方法を、人・記録・専門窓口の複数に分ける。'],
    caution: '深刻な不調を友人だけで抱えず、必要なら専門的な支援につなぐ。',
  },
  {
    id: 'master336-346', title: '同じ愚痴を何度も持ち込まない',
    essence: '解決しない話を反復すると、相手に同じ負担を繰り返し背負わせる。',
    explanation: '同じ不満を話すと一時的に軽くなるが、聞き手はそのたびに状況を思い出し、怒りや悲しみに同調し、以前と違う反応まで探す。話し手に変化も目的もないまま反復されると、相手は助けられない無力感と、また始まるかもしれない警戒を持つ。愚痴の負担は一回の長さだけでなく、終わりが見えない予測不能さからも生まれる。\n同じ話をしたくなったら、「前にも話した件で、今日は結論を出したい」「五分だけ吐き出したい」と目的と時間を先に示す。前回から新しい事実も行動もないなら、まず紙に書く、散歩する、当事者へ伝える準備をするなど別の処理を試す。相手に話すときは、何が変わったかを一つ添えると、同じ感情の再放送になりにくい。\n繰り返し話すことが必要な喪失や被害もあり、回数だけで責めるべきではない。ただし、その場合ほど相手の同意を取り、友人以外の支援も確保する。聞いてもらうことを解決の代わりにせず、変えられる問題なら小さな行動へ、変えられない問題なら感情を整える方法へつなぐ。',
    importance: 3, relatedTheoryIds: ['kb_023', 'kb_030', 'kb_229'], primaryTheoryIds: ['kb_030'],
    todayActions: ['同じ話をするときは、目的と終える時間を先に伝える。', '前回から変わった事実か、次に試す行動を一つ用意する。'],
    caution: '喪失や被害の回復には反復が必要なこともあり、回数だけで否定しない。',
  },
  {
    id: 'master336-347', title: '自虐で相手にフォローさせない',
    essence: '自分を下げ続けると、相手に否定と励ましを繰り返させることになる。',
    explanation: '自虐は場を和ませることもあるが、「自分なんて価値がない」を繰り返すと、相手は笑えば傷つけ、黙れば同意したように見えるため、毎回否定して励ますしかなくなる。話し手は低い位置を取っているようで、実際には相手の反応を強く拘束している。会話のたびに自己評価を支える感情労働を求められると、親しさより緊張が残る。\n失敗を話すなら、「私は本当に駄目」ではなく、「準備が足りなくて今回は失敗した」と出来事へ限定する。照れ隠しなら、「褒められると照れるけどうれしい」と感情をそのまま言う。もし自己否定への意見が欲しいなら、「今は励ましがほしい」と依頼に変えれば、相手は何を返すべきか推測せずに済む。\n一度の自虐や互いに合意した軽い冗談まで禁止する必要はない。注意したいのは、同じ否定を何度も提出し、相手の肯定でしか会話を終えられない形である。深い自己否定が続くなら、友人の即席の励ましだけに頼らず、休養や専門的な相談も考える。相手の好意を、自分の価値を毎回証明する義務に変えない。',
    importance: 3, relatedTheoryIds: ['kb_479', 'kb_047', 'kb_480'], primaryTheoryIds: ['kb_479'],
    todayActions: ['自虐したくなったら、人格ではなく具体的な出来事を言う。', '励ましが必要なときは、推測させず「励ましてほしい」と頼む。'],
    caution: '自己否定が強く続く場合は、友人のフォローだけに頼らない。',
  },
  {
    id: 'master336-348', title: '相談では共感と助言を分ける',
    essence: '相手が求めているものを外すと、善意でも会話は負担になる。',
    explanation: '相談には、気持ちを分かってほしい時と、選択肢を整理したい時がある。共感を求める相手へ解決策を並べると、「その程度も考えていない」と能力を低く見られた感覚が生まれる。反対に具体策が必要な相手へ相づちだけを返すと、問題を一人で処理する負担が残る。善意の量より支援の種類の不一致が疲れを生む。\n話を聞き始めるときに、「今日は聞いてほしい感じ？一緒に考える感じ？」と二択で確かめる。途中で変わることもあるので、「ここから案を出してもいい？」と切り替え点を置く。共感なら感情や意味を要約し、助言なら前提、選択肢、次の一歩を整理する。同じ会話でも役割を分ければ、相手は不要な反論や説明を減らせる。\n相手自身が何を求めているか分からないこともある。そのときはまず短く受け止め、急いで決めなくてよい。共感は全面賛成ではなく、助言は決定権の取得でもない。聞く段階と考える段階を区切り、最終的に選ぶのは相手だと保つことで、支援が管理や放置へ傾くのを防げる。',
    importance: 3, relatedTheoryIds: ['kb_410', 'kb_229', 'kb_398'], primaryTheoryIds: ['kb_410'],
    todayActions: ['相談の冒頭で「聞く・一緒に考える」のどちらかを尋ねる。', '助言へ移る前に「案を出してもいい？」と確認する。'],
    caution: '共感は全面賛成、助言は相手の決定権を引き取ることではない。',
  },
  {
    id: 'master336-349', title: '求められていない助言を押しつけない',
    essence: '正しい助言でも、頼まれていなければ管理や干渉として伝わる。',
    explanation: '助言は内容だけでなく、「あなたの判断には修正が必要だ」という関係上のメッセージも運ぶ。頼まれていない場面で正解を示すと、相手は事情を説明して自分を弁護するか、従わない理由を示す仕事を負う。善意でも選択権を狭められた感覚が生まれ、正しさが強いほど反発や無力感につながりやすい。\n友人が仕事の不満を話したとき、すぐ「転職すべき」と結論を出さず、「意見がほしい？今日は聞くだけがいい？」と確認する。役立ちそうな情報があるなら、「一つ案があるけど聞く？」と入口を渡す。断られたら理由を追わず、話を戻す。許可があれば、命令ではなく選択肢として短く提示する。\n緊急の危険や他者への重大な被害がある場合は、頼まれていなくても伝える必要がある。それ以外では、助言したい衝動と相手の必要を分ける。情報を差し出すことはできても、採用の決定は相手に残す。自律性を守った助言は、相手が必要な時に再び相談できる関係も守る。',
    importance: 3, relatedTheoryIds: ['kb_050', 'kb_410', 'kb_520'], primaryTheoryIds: ['kb_050'],
    todayActions: ['助言の前に「意見を聞きたい？」と許可を取る。', '助言は命令ではなく、選べる案として一つだけ示す。'],
    caution: '緊急の危険や重大な被害がある場合は、必要な警告をためらわない。',
  },
  {
    id: 'master336-350', title: '機嫌を察してもらおうとしない',
    essence: '不機嫌を言葉にせず示すと、周囲に原因探しと感情監視をさせる。',
    explanation: '返事を短くする、物音を強くする、ため息をつくといった不機嫌の表示は、要求を言わずに周囲へ解読を求める。相手は自分が原因か、何を直せば安全かを推測し、表情や声の変化を監視し続ける。理由が分からないほど責任の範囲も見えず、一人の感情を全員で管理するような緊張が生まれる。\n余裕がないなら、「今日は仕事で疲れていて静かにしたい。あなたのせいではない」と短く言う。相手にしてほしいことがある場合は、「十分だけ一人にしてほしい」「明日話したい」と具体的に依頼する。すぐ言葉にできないときも、「まだ整理できないけれど、後で説明する」と期限を置けば、相手は無限に原因を探さずに済む。\n感情を常に明るく整える必要はない。不機嫌になる自由と、その処理を周囲へ無言で委ねない責任を分ける。強い感情の最中は距離を置き、落ち着いてから観察、感情、必要、依頼を言葉にする。説明は相手に機嫌を直させる命令ではなく、責任の所在と次の行動を共有するために行う。',
    importance: 3, relatedTheoryIds: ['kb_023', 'kb_233', 'kb_053'], primaryTheoryIds: ['kb_233'],
    todayActions: ['不機嫌なときは「あなたのせいではない」を必要に応じて伝える。', '望む対応を、時間や行動が分かる一文で依頼する。'],
    caution: '感情を隠すのではなく、相手に解読と処理を丸投げしない。',
  },
  {
    id: 'master336-351', title: '「察して」を関係の前提にしない',
    essence: '言葉にしない要求が増えるほど、親しさは気楽さではなく緊張に変わる。',
    explanation: '親しいなら分かるはずだと思うほど、要望を言葉にせず試す場面が増える。しかし相手は同じ情報も感覚も持っておらず、外せば愛情不足として責められる。正解が明示されない試験が続くと、相手は会話の内容より声色や沈黙から隠れた要求を探すようになり、親しさが常時の注意力を求める関係へ変わる。\n誕生日の過ごし方、連絡頻度、疲れている時の接し方など、期待があることほど具体的に伝える。「言わなくてもしてほしい」ではなく、「今夜は話を聞いてほしい」「返信は明日で大丈夫」のように、望みと余白を一緒に示す。相手が外した後に答えを明かすのではなく、外す前に共有する方が互いの自由時間と安心を守れる。\n全部を説明しなくても通じる喜びは、親しさの結果として楽しめばよい。ただし、それを愛情の証明条件にはしない。伝えた上で応じるかどうかは相手にも選択権がある。察知の精度ではなく、要望を安全に言え、断りや調整もできることを関係の強さと考える。',
    importance: 3, relatedTheoryIds: ['kb_233', 'kb_053', 'kb_434'], primaryTheoryIds: ['kb_233'],
    todayActions: ['期待していることを、相手が行動に移せる一文にする。', '依頼と一緒に、断る・延期する選択肢も示す。'],
    caution: '通じ合う喜びを否定せず、それを愛情の試験にしない。',
  },
  {
    id: 'master336-352', title: '相手の悩みを勝手に小さくしない',
    essence: '他人や自分と比較して軽く扱うと、相手は悩みより話したことを後悔する。',
    explanation: '「もっと大変な人がいる」「自分の時は平気だった」は、悩みの強さを比較で判定する言葉である。相手が感じた苦しさより、こちらの基準を上に置くため、相手は出来事に加えて「この程度でつらい自分は弱い」という恥まで抱える。相談の場が理解ではなく苦しさの資格審査になると、次から助けを求めにくくなる。\n相手が試験や失恋で落ち込んでいたら、規模を評価せず、「あなたにとって大きかったんだね」「何が一番つらい？」と本人の意味を聞く。視野を広げる話が役立ちそうでも、まず受け止めた後に「別の見方も一緒に考える？」と確認する。自分の経験は基準ではなく、理解の仮説として限定して使う。\n受容は、事実関係や危険度を誇張することではない。感情の存在を認めることと、状況を評価することを分ける。相手の悩みを唯一最大のものと扱わなくても、その人に生じている負担は尊重できる。比較で早く閉じず、必要なら具体的な支援へつなぐ方が、相手の尊厳と問題解決の両方を守れる。',
    importance: 3, relatedTheoryIds: ['kb_403', 'kb_404', 'kb_266'], primaryTheoryIds: ['kb_403'],
    todayActions: ['悩みを聞いたら、比較せず本人にとっての意味を尋ねる。', '別の見方を示す前に「一緒に考える？」と確認する。'],
    caution: '受容と事実評価を分け、重大な危険は適切に見立てる。',
  },
  {
    id: 'master336-353', title: 'いじりに相手の弱点を使わない',
    essence: '場が笑っても、本人には次も狙われるという警戒が残る。',
    explanation: '見た目、失敗、家庭、恋愛など本人が守りたい弱点を笑いにすると、その場では本人も合わせて笑うことがある。拒めば空気を壊す人にされるため、笑顔は同意の証拠にならない。周囲の笑いが報酬になる一方、本人には「また材料にされる」という予測が残り、発言や自己開示を控える心理的安全性の低下につながる。\n冗談にするなら、その場の出来事や自分自身など、相手の尊厳と長く結びつかない対象を選ぶ。相手が以前笑った話でも、人前で繰り返す前に「これ話して大丈夫？」と確認する。表情が固まる、弁解が増える、急に静かになるといった変化があれば、笑いを重ねずすぐ話題を止め、短く謝る。\nいじりが成立する関係もあるが、対等に断れ、互いに同程度に返せ、後へ傷が残らないことが条件である。「冗談が通じない」で責任を相手へ移さない。盛り上がりの利益を得る人と、尊厳の費用を払う人が分かれていないかを見る。迷う弱点は使わない方が、安心して笑える範囲は広がる。',
    importance: 3, relatedTheoryIds: ['kb_402', 'kb_055', 'kb_436'], primaryTheoryIds: ['kb_402'],
    todayActions: ['冗談は、相手の外見・失敗・家庭など長く残る弱点から外す。', '表情が固まったら笑いを重ねず、すぐ止めて謝る。'],
    caution: '本人の笑顔だけで同意と決めず、断れる関係かを見る。',
  },
  {
    id: 'master336-354', title: '人前で相手を下げない',
    essence: '第三者の前でのからかいや暴露は、冗談以上に立場を傷つける。',
    explanation: '二人なら流せる指摘でも、第三者の前では評価と記憶が加わる。失敗や秘密を笑いにすると、本人は内容への反応だけでなく、周囲からどう見られたか、訂正すれば場がどうなるかまで同時に処理する。公の場で失った面子はその場の謝罪だけでは戻りにくく、次の集まりでも立場を守る警戒が続く。\n直したいことがあるなら、緊急性がない限り二人の時に事実と要望を伝える。集まりで相手の失敗談を話したくなったら、本人が自分で話しているか、共有範囲に同意しているかを確かめる。誰かが相手を下げた場合は、便乗せず話題を戻すか、その人の貢献を事実として補い、笑いの集中を切る。\n危険を止める、誤情報を訂正するなど、人前で言う必要がある場面はある。その場合も人格を下げず、対象となる行動や事実に限定する。注意と見せしめを混ぜない。相手が反論しにくい観客のいる場所で優位を取らず、尊厳を保ったまま修正できる出口を残す。',
    importance: 3, relatedTheoryIds: ['kb_055', 'kb_056', 'kb_159'], primaryTheoryIds: ['kb_055'],
    todayActions: ['修正の必要がある話は、できる限り二人の場へ移す。', '第三者の失敗談は、本人の共有許可が確認できなければ話さない。'],
    caution: '安全確保や重大な誤情報の訂正は、人格ではなく事実に限定して行う。',
  },
  {
    id: 'master336-355', title: '親しさを免罪符にしない',
    essence: '仲がいいほど雑に扱ってよいわけではなく、小さな無礼ほど蓄積する。',
    explanation: '親しい関係では、一度の遅刻や雑な返事を許してもらえることがある。しかし許容を権利だと受け取ると、謝罪、感謝、確認が省かれ、相手だけが飲み込む役になる。「仲がいいから」という言葉で異議も封じられるため、小さな無礼は出来事以上に、尊重されていない感覚として静かに蓄積する。\n家族や古い友人にこそ、予定を変えたら連絡し、してもらったことには短く感謝する。以前は平気だった冗談や連絡頻度も、環境が変われば受け取り方が変わるので、ときどき「今も大丈夫？」と確かめる。相手が不満を言ったときは、親しさの証明を求めず、何を変えるかを具体的に返す。\n形式ばった距離を置く必要はなく、気楽さは親しさの価値である。ただし気楽さは、相手がいつでも断れ、雑さを指摘しても関係を脅かされないときに成り立つ。親しさを配慮の省略許可ではなく、率直に調整できる土台として使う。近い相手ほど、礼儀を大きな儀式ではなく小さな確認として残す。',
    importance: 3, relatedTheoryIds: ['kb_300', 'kb_434', 'kb_092'], primaryTheoryIds: ['kb_300'],
    todayActions: ['親しい相手にも、予定変更の連絡と短い感謝を省かない。', '昔からの冗談や距離感が今も大丈夫かを一度確認する。'],
    caution: '親しさの気楽さまで失わず、断りや修正が安全にできる状態を守る。',
  },
  {
    id: 'master336-356', title: '好意に見返りを求めない',
    essence: '「これだけしたのに」が増えるほど、好意は相手にとって借金になる。',
    explanation: '親切の後で反応や返礼を当然視すると、受け手には知らないうちに契約へ参加させられた感覚が残る。感謝の量、連絡頻度、次の手助けまで採点されるため、好意を受け取るたびに将来の返済を計算するようになる。「断れば恩知らず」と思わせる関係では、贈り物や支援そのものが心理的な債務と統制手段へ変わる。\n何かをする前に、返ってこなくても自分が納得できる範囲かを確かめる。返礼が必要な貸し借りや分担なら、好意の形に隠さず「次回はお願いしたい」と先に合意する。期待が生まれた後も、「してあげたのに」と請求する前に、自分の希望として言葉にし、相手が断れる余地を残す。\n互恵性そのものは関係を支えるため、いつも一方だけが与える必要はない。偏りが続いて苦しいなら、提供を減らす、役割を話し合う、距離を調整する。大切なのは、無条件の好意と条件付きの交換を混ぜないことだ。見返りを求めるなら最初から合意にし、好意として渡したものを後から請求書へ変えない。',
    importance: 3, relatedTheoryIds: ['kb_047', 'kb_433', 'kb_030'], primaryTheoryIds: ['kb_047'],
    todayActions: ['親切の前に、返礼がなくても納得できる範囲かを確かめる。', '分担や貸し借りなら、期待を好意に隠さず先に合意する。'],
    caution: '関係の偏りを我慢し続けず、提供量や役割は率直に調整する。',
  },
];

const elaborations = {
  'master336-343': '相手は自分の選択を話すたびに、承認を申請する構図へ置かれてしまう。',
  'master336-344': 'しかも結果が出る前に存在した不確実さまで、後から見えなくなりやすい。',
  'master336-345': '聞き手の沈黙もまた、休める時間として尊重する。',
  'master336-348': '役割が見えるだけで、互いの認知負荷も下がる。',
  'master336-349': '相手が黙るのは納得ではなく、反論を諦めた結果かもしれない。',
  'master336-350': '予告のない機嫌の変化は、次の変化への警戒まで習慣化させる。',
  'master336-351': '明文化されない基準は、成功しても次の試験を終わらせない。',
  'master336-352': '苦しさを比べずに聞くことが、必要な支援を見つける入口になる。',
  'master336-353': '笑いが起きた事実より、本人がその場を離れた後も安心できるかを見る。',
  'master336-354': '観客が増えるほど、本人がその場で示せる反応の自由も小さくなり、傷を隠す負担まで増える。',
  'master336-355': '過去の近さは、現在の同意を自動的に更新するものではない。',
  'master336-356': '受け取る側が安心して断れることも、好意の一部である。',
};
for (const item of items) if (elaborations[item.id]) item.explanation = `${item.explanation} ${elaborations[item.id]}`;

const catalog = await readJson('techniques.json');
const practicalActions = await readJson('practical-actions.json');
const comprehensive = await readJson('comprehensive-theory-links.json');
const primary = await readJson('primary-theory-links.json');
const theories = await readJson('theories.json');
const metadata = await readJson('metadata.json');

const interpersonal = catalog.categories.find((category) => category.key === 'interpersonal');
if (!interpersonal) throw new Error('The interpersonal category is missing.');
const existingPersona = interpersonal.subcategories.find((persona) => persona.name === personaName);
if (existingPersona && existingPersona.items.some((item) => !items.some((source) => source.id === item.id))) {
  throw new Error(`${personaName} contains an unexpected technique; refusing to replace it.`);
}
interpersonal.subcategories = interpersonal.subcategories.filter((persona) => persona.name !== personaName);
const existingIds = new Set(catalog.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items.map((item) => item.id))));
for (const item of items) if (existingIds.has(item.id)) throw new Error(`Technique id already exists: ${item.id}`);

interpersonal.subcategories.push({
  name: personaName,
  articleTitle: personaName,
  items: items.map(({ todayActions, caution, ...item }, index) => ({
    ...item,
    field: '対人術',
    persona: personaName,
    subtitle: item.essence,
    displayOrder: index + 1,
    status: 'published',
  })),
});

const addedIds = new Set(items.map((item) => item.id));
practicalActions.splice(0, practicalActions.length, ...practicalActions.filter((item) => !addedIds.has(item.id)));
practicalActions.push(...items.map((item) => ({
  id: item.id,
  title: item.title,
  todayActions: item.todayActions,
  examples: [],
  cautions: [item.caution],
})));
for (const item of items) {
  comprehensive[item.id] = item.relatedTheoryIds;
  primary[item.id] = item.primaryTheoryIds;
}

const allCards = catalog.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items));
metadata.source = 'master336 + 一緒にいて疲れない人（20処世術）';
metadata.techniqueCount = allCards.length;
metadata.personaCount = catalog.categories.reduce((count, category) => count + category.subcategories.length, 0);
metadata.catalogVersion = 'master356';

const theoryById = new Map(theories.map((theory) => [theory.tagId, theory]));
const linkedTheoryIds = new Set(allCards.flatMap((card) => card.relatedTheoryIds ?? []));
const distributionOf = (values) => Object.fromEntries([...values.reduce((counts, value) => counts.set(value, (counts.get(value) ?? 0) + 1), new Map())].sort(([left], [right]) => left - right));
const audit = {
  reviewPolicy: 'Prefer comprehensive coverage. Primary theories are representative entry points; supplementary theories contain similar, complementary, and alternate perspectives without implying lower importance.',
  techniques: allCards.length,
  theories: theories.length,
  links: allCards.reduce((count, card) => count + (card.relatedTheoryIds?.length ?? 0), 0),
  primaryLinks: allCards.reduce((count, card) => count + (card.primaryTheoryIds?.length ?? 0), 0),
  linkedTheories: linkedTheoryIds.size,
  unlinkedTheories: theories.length - linkedTheoryIds.size,
  minimumLinksPerTechnique: Math.min(...allCards.map((card) => card.relatedTheoryIds?.length ?? 0)),
  maximumLinksPerTechnique: Math.max(...allCards.map((card) => card.relatedTheoryIds?.length ?? 0)),
  distribution: distributionOf(allCards.map((card) => card.relatedTheoryIds?.length ?? 0)),
  primaryDistribution: distributionOf(allCards.map((card) => card.primaryTheoryIds?.length ?? 0)),
  supplementaryDistribution: distributionOf(allCards.map((card) => (card.relatedTheoryIds?.length ?? 0) - (card.primaryTheoryIds?.length ?? 0))),
  wisdomSupportLinks: 269,
  categoryCoverage: Object.fromEntries([...new Set(theories.map((theory) => theory.categoryId))].map((categoryId) => {
    const categoryTheoryIds = new Set(theories.filter((theory) => theory.categoryId === categoryId).map((theory) => theory.tagId));
    return [categoryId, {
      theories: categoryTheoryIds.size,
      linkedTheories: [...categoryTheoryIds].filter((id) => linkedTheoryIds.has(id)).length,
      links: allCards.reduce((count, card) => count + (card.relatedTheoryIds ?? []).filter((id) => categoryTheoryIds.has(id)).length, 0),
    }];
  })),
  generatedAt: new Date().toISOString().slice(0, 10),
};
audit.supplementaryLinks = audit.links - audit.primaryLinks;

for (const item of items) {
  for (const theoryId of item.relatedTheoryIds) if (!theoryById.has(theoryId)) throw new Error(`${item.id} references missing theory ${theoryId}.`);
  if (item.primaryTheoryIds.some((theoryId) => !item.relatedTheoryIds.includes(theoryId))) throw new Error(`${item.id} has a primary theory outside its comprehensive set.`);
}

await Promise.all([
  writeJson('techniques.json', catalog),
  writeJson('practical-actions.json', practicalActions),
  writeJson('comprehensive-theory-links.json', comprehensive),
  writeJson('primary-theory-links.json', primary),
  writeJson('metadata.json', metadata),
  fs.writeFile(path.join(root, 'docs', 'theory-link-audit', 'content-review-summary.json'), `${JSON.stringify(audit, null, 2)}\n`),
]);

console.log(JSON.stringify({ persona: personaName, added: items.length, personas: metadata.personaCount, techniques: metadata.techniqueCount }, null, 2));
