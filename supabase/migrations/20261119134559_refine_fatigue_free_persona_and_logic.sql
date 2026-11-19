-- Consolidate overlapping articles and add three entries to 論理・因果推論.
begin;

create temporary table dialogue_technique_edits on commit drop as
select * from jsonb_to_recordset($catalog$
[{"id":"master336-338","title":"相手の話を実績の競争にしない","essence":"相手の報告に上回る実績を重ねると、喜びを分かち合う場が比較の場に変わる。","explanation":"「初めて五キロ走れた」と話す友人に「私は十キロ走るよ」と返すと、話題は二人の距離の比較に変わる。友人が話したかったのは、走れるようになったことかもしれない。「前は三キロがきついって言っていたね。何が変わったの？」と、その人の出発点や変化に関心を向けると、報告したかった話を続けてもらえる。\n仕事でも「今月ようやく一件契約が取れた」という報告に、部署の最高記録を重ねると、成果が小さいという含みをもたせやすい。「どんな工夫が効いた？」と尋ねれば、本人の工夫を共有できる。自分の経験が話題に合うときは、「私も距離が伸びたときはうれしかった」と感情を短く返す。記録まで持ち出すのは、相手が練習方法や目安を知りたがっているときで足りる。\n比較が役に立つのは、目標や判断基準を一緒に考えるときだ。相手が記録を比べたいときは、練習歴や使える時間など、比較に必要な条件も添える。返す前に、相手が共有しているのは喜びか、比較に使う情報かを考える。喜びの報告なら、その人が何を達成したのかに話を戻すと、数値の大きさにかかわらず会話は続く。","importance":3,"practices":["相手の報告に「どんな工夫が効いた？」と聞く。","自分の実績を出す前に、比較が相手の役に立つか考える。"],"cautions":["数字で比較するときは、練習歴や使える時間などの前提もそろえる。"],"examples":[],"theory_ids":["kb_266","kb_055"],"primary_theory_ids":["kb_266"],"tags":["会話","対等","マウンティング"],"display_order":2,"previous_hash":"67b6b5d9f9cbd36d7c4f436cce33e126"}
,{"id":"master336-340","title":"自分の成果は喜びが伝わる長さで話す","essence":"成果と自分がうれしかった理由を一つずつ伝え、相手が興味を示したところを詳しく話す。","explanation":"受賞や昇進は、親しい人に話したくなる。まず伝えたい出来事と、自分にとっての意味を一つずつ話せば、聞き手はその喜びを受け取れる。「企画が通った。半年かけて直した案だったから、ほっとした」と話すと、成果だけでなく、なぜ報告したかったかも伝わる。\n聞き手の「おめでとう」を受け取ったあと、選考の倍率や上司の評価を続けて足すと、相手はそのたびに反応を返すことになる。最初の一往復でいったん止まり、聞かれたところから詳しく話す。「どこが大変だった？」と聞かれたら、その話を一つ選ぶ。次の話題に移るときも、急に質問で相手に会話を渡すより、自然な間を残すと話しやすい。\n業務報告や面接では、結果を裏づける数字や自分が担った仕事を具体的に伝える必要がある。友人との会話で力を入れるのは、その人と共有したい経験や感情だ。成果を話す前に「いちばん聞いてほしいのは何だろう」と一つ選んでおくと、短くても気持ちが伝わる。手伝ってくれた人への感謝を言いたいなら、どんな支えがうれしかったのかを一言にする。","importance":2,"practices":["成果と、それが自分にとってうれしかった理由を一つずつ伝える。","祝福を受け取ったら一度話を止め、質問があれば答える。"],"cautions":["面接や業務報告では、判断に必要な実績と根拠を具体的に伝える。"],"examples":[],"theory_ids":["kb_112","kb_266"],"primary_theory_ids":["kb_112"],"tags":["自慢","称賛","会話の負担"],"display_order":4,"previous_hash":"1fc630e1da98467a34ee936db2744d84"}
,{"id":"master336-345","title":"愚痴を話す前に余裕を聞き、聞き役を固定しない","essence":"愚痴をこぼす前に時間を確認し、同じ話が続くときは頼り先や話す目的を見直す。","explanation":"親しい人にも、話を聞ける日と、早く休みたい日がある。「職場のことで少し吐き出したい。今、十分だけ聞ける？」と先に聞くと、相手は自分の予定や気力に合わせて答えられる。難しいと言われたら、その場で話を始めずに「分かった、また今度」と引き取る。聞いてくれたら、約束した時間で一区切りつける。\n同じ出来事を繰り返し話したくなったら、今回何を求めているかを確かめる。気持ちを整理したい日はメモに書き、相手の意見がほしい日は「明日の面談で何を伝えるか、少し一緒に考えてほしい」と頼む。毎回同じ友人に頼っているなら、別の相談先や職場の窓口も使う。まだ整理がつかないこともあるので、前と同じ話題に触れること自体に罪悪感を持つ必要はない。\n聞く側も「今日は十分なら聞ける」「今週は余裕がない」と、自分が引き受けられる範囲を伝えてよい。話が終わったら、相手にも話したいことがあるかに目を向ける。悩みが長引く時期でも、頼み方を変え、負担を一人に集めない工夫があれば、互いに自分の都合を言える関係を保ちやすい。","importance":3,"practices":["話す前に、聞いてもらいたい時間と今の都合を確認する。","同じ話をしたいときは、気持ちの整理、具体的な相談、別の頼り先のどれが必要か考える。"],"cautions":["繰り返し相談したい悩みほど、相手が断れる余地と複数の相談先を持つ。"],"examples":[],"theory_ids":["kb_398","kb_431","kb_480"],"primary_theory_ids":["kb_398"],"tags":["愚痴","感情労働","友人"],"display_order":9,"previous_hash":"71fac29d8344ef3340862acc05e57d50"}
,{"id":"master336-348","title":"相談では聞くか提案するかを確かめる","essence":"相手が話したいことを聞き、提案は求められたときに選択肢として渡す。","explanation":"「上司とのやり取りがしんどかった」と言われたとき、最初に必要なことは相談する人によって違う。経緯を聞いてほしい人もいれば、明日の返事を一緒に考えてほしい人もいる。「どんなやり取りだった？」と話を聞き、少し落ち着いてから「今日は聞いてほしい？　次の対応も考える？」と尋ねると、その場でできる手助けが分かる。\n聞いてほしいと言われたら、起きたことや気持ちを短く言い返し、続きを待つ。提案を求められたら、「私なら、話を短くメモしてから返事をする。今の状況でできそう？」というように、一つの選択肢を理由と一緒に出す。「普通はこうする」「こうした方がいい」と重ねると、相手は相談の途中で自分の判断まで説明することになる。\n話しているうちに、必要なものは変わる。先ほど提案を断った人が、終盤に「どう思う？」と聞くこともある。逆に、解決策を考え始めてから「今日はもういい」と言われたら、そこで止める。判断するのは本人なので、提案したあとに採用を迫ったり、後日報告を求めたりせず、相手が選んだ次の一歩を受け止める。","importance":3,"practices":["話を聞いたあと、「聞いてほしい？　次の対応も考える？」と確認する。","提案する場合は、試せる選択肢を一つ示し、相手の事情を聞く。"],"cautions":["差し迫った危険に気づいたときは、安全に関わる事実を先に伝える。"],"examples":[],"theory_ids":["kb_410","kb_398"],"primary_theory_ids":["kb_410"],"tags":["相談","共感","助言"],"display_order":12,"previous_hash":"ae52164c86b7d5d05597e63ebe0df77d"}
,{"id":"master336-350","title":"不機嫌なときは自分の状態を一言伝える","essence":"静かになった理由と少し休むことを伝えると、周囲は自分が責められているか推測せずに済む。","explanation":"疲れた日や取り乱したとき、黙って気持ちを落ち着かせたくなる。周囲に理由が見えないと、返事の短さやため息から「何か気に障ったかな」と推測することになる。「今日は仕事で消耗していて静かかも。少し休んだら戻るね」と一言伝えれば、必要な距離を取りつつ、相手にも状況が分かる。\n意見の食い違いでいら立ったときは、「今はきつい言い方をしそうだから、十分休んで続きを話したい」と言える。話を止める理由と、再開の目安を伝えると、相手はいつまで待てばよいか分かる。落ち着いたらこちらから声をかける。すでに強い口調で返してしまったなら、「さっきの言い方はきつかった。ごめん」と、その振る舞いについて短く謝る。\n事情を細かく説明できない日も、「少し考える時間がほしい」で十分な場合がある。相手の行動に実際に困っているなら、戻ってきたあとで何が起きたかと、次にどうしてほしいかを伝える。落ち着くための時間と、二人で解決する話題にそれぞれ場所を作っておけば、相手が先に機嫌を直しに来るまで会話が止まることも減らせる。","importance":3,"practices":["返事が短くなりそうな日に、今の状態と休むことを一言伝える。","話し合いを中断したら、伝えた目安を頼りに自分から再開する。"],"cautions":["相手の行動に困っている場合は、落ち着いてから何が起きたかを具体的に話す。"],"examples":[],"theory_ids":["kb_233","kb_023","kb_053","theory-62543145-f91d-448d-aece-2a44802164f8"],"primary_theory_ids":["kb_233"],"tags":["不機嫌","感情調整","伝達"],"display_order":14,"previous_hash":"9f818956d80ec1a91b293a94152126b0"}
,{"id":"master336-351","title":"してほしいことは具体的に頼む","essence":"希望する行動と時期を短く伝え、相手ができる範囲を話せるようにする。","explanation":"近しい相手ほど、予定や習慣を知っているので、言わなくても分かると期待しやすい。けれど「まめに連絡して」と言われても、何をどのくらい知らせてほしいかは人によって違う。「夕食を待つので、帰りが七時を過ぎそうな日は一言もらえると助かる」と頼めば、相手は何を頼まれたかと、その理由を知ることができる。\n頼んだあとには、できるかを聞く。仕事中に連絡が難しいなら「退勤した時点で知らせる」など、相手が実行しやすい形を探せる。すれ違いが起きたときは、「前にも困った」とだけ伝えるより、どの場面でどんな連絡があると助かるかを話す。全員にとって当たり前だと思う行動でも、二人の取り決めとして確認し直すと使いやすい。\n毎日の役割分担なら、一度決めたあとに「今週はどうだった？」と短く振り返る。予定が変わったときに修正できる形にしておけば、約束を守れない時期も相談しやすい。小さなお願いほど、察してもらえるまで我慢するより、その時点で短く具体的に伝えておくとよい。「私がしてほしいこと」として言葉にすると、相手も条件を出しやすくなる。","importance":3,"practices":["曖昧なお願いを、してほしい行動と時期が分かる一文に言い換える。","頼んだあとに「できそう？　難しい日はどうする？」と確認する。"],"cautions":["こちらの希望を伝えたら、相手が難しいと言える余地を残す。"],"examples":[],"theory_ids":["kb_233","kb_053"],"primary_theory_ids":["kb_233"],"tags":["察して","期待管理","伝達"],"display_order":15,"previous_hash":"1e6769d88dd95b3ed1058f8fcf1730d6"}
,{"id":"master336-353","title":"弱みや失敗を人前で笑いの材料にしない","essence":"本人が笑っていても、人前では断りづらい。失敗や秘密は話す場所と相手を選ぶ。","explanation":"見た目、失敗、家庭の事情を笑い話にされると、本人は腹が立ってもその場の空気に合わせて笑うことがある。特に初対面の人や同僚がいると、冗談を止めるには、内容に加えて「場をしらけさせた」と思われる心配まで引き受けることになる。二人のときに笑えた話も、その内容を知らない人の前でどう聞こえるかは変わる。\n皆が集まる場では、目の前で全員が見た出来事など、特定の人の評判に結びつかないものを話題にする。本人から聞いた失敗談を共有したいなら、人前で尋ねる前に、誰に何を話すのかを個別に確認する。本人が急に静かになったり弁解を始めたりしたら、笑いを重ねず「今の話は出すべきじゃなかった」と止め、落ち着いてから本人に謝る。\n相手の間違いを直す必要がある場合にも、伝える場所を選べる。すぐの訂正が要らないなら、あとで一対一で事実と影響だけを伝える。皆に訂正が必要な情報なら、「集合は七時です」と共有し直せば足りる。発言する前に、その場で本人が気兼ねなく止められるか、ほかの人に伝える必要があるかを考えると、冗談も指摘も扱いやすくなる。","importance":3,"practices":["失敗談や私的な話を使わず、その場を皆で楽しめる話題を選ぶ。","訂正が急ぎでなければ、あとで本人に一対一で伝える。"],"cautions":["過去に笑ってくれた話でも、聞き手が変わるときは個別に確認する。"],"examples":[],"theory_ids":["kb_402","kb_055"],"primary_theory_ids":["kb_402"],"tags":["いじり","尊重","弱み"],"display_order":17,"previous_hash":"5ac84fdb8586d24d540c77361e1eef0d"}
,{"id":"master336-452","title":"否定から入らない","essence":"「いや」「でも」と返したくなったら、相手が何を楽しみにし、何に困っているかを一つ聞く。","explanation":"友人が「週末は少し遠出したい」と言ったとき、混雑が頭に浮かんで「いや、どこも混むよ」と返すことがある。そこで話が終わると、友人は何を楽しみにしているのかを言う機会を失う。「どこか行きたいところがある？」と一つ尋ねれば、出かけたい理由が分かる。目当てが新しい店なら、時間をずらすこともできる。\nたとえば「海が見たい」と聞いたら、「海を見に行くのはいいね。帰りが渋滞しそうだから、朝から行って昼過ぎに戻るのはどう？」と返す。自分が遠出をしたくない日は、「景色のいいところで息抜きしたいんだね。私は遠出する元気がないから、近場なら行けそう」と伝えられる。話を聞くことと、誘いを引き受けることはそれぞれ自分で選べる。\n予定の相談だけでなく、相手が好きなものを話しているときにも使える。好みが違う映画なら、評価を口にする前に「どの場面が好きだった？」と聞いてみる。逆に、その場で訂正が必要な事実や差し迫った危険は早めに具体的に伝える。短い会話では、初めの一言に相手の話を続けられる余地があるだけで、お互いの事情や好みを話しやすくなる。","importance":3,"practices":["反射的に「いや」「でも」と言いそうになったら、相手がその案を出した理由を一つ尋ねる。","気が進まない誘いには、相手の希望を短く言い返し、自分の都合や可能な範囲を伝える。"],"cautions":["差し迫った危険やその場で訂正が必要な誤りは、すぐに具体的に伝える。"],"examples":[],"theory_ids":["kb_1151","kb_412","kb_1152"],"primary_theory_ids":["kb_1151"],"tags":["否定から入らない","意見の違い","受け止め方"],"display_order":21,"previous_hash":null}
]$catalog$::jsonb) as t(
  id text, title text, essence text, explanation text, importance smallint, practices jsonb,
  cautions jsonb, examples jsonb, theory_ids jsonb, primary_theory_ids jsonb, tags jsonb,
  display_order integer, previous_hash text
);
create temporary table dialogue_technique_merges on commit drop as
select * from jsonb_to_recordset($catalog$
[{"id":"master336-346","previous_hash":"60aaa8220f1a9acbfc4c4609dc303dd7"}
,{"id":"master336-349","previous_hash":"26b78fbce9528a33c9ecf34f422fd86d"}
,{"id":"master336-354","previous_hash":"b0d98468c2a7824d84f7a29a7b4a14bb"}
]$catalog$::jsonb) as t(id text, previous_hash text);
create temporary table dialogue_theory_additions on commit drop as
select * from jsonb_to_recordset($catalog$
[{"id":"kb_1151","title":"イエス・バット話法","summary":"同意できる点を具体的に示してから、異なる見解や懸念を理由とともに述べる話法。\n「作業を減らす目的には賛成です。締切までに全件切り替えるのは難しいので、一部署から始めませんか」と返す。意見が一致する範囲を明らかにすると、残る論点を検討しやすい。賛成できる点が見つからない場合は、相手が重視している条件を尋ねる。","aliases":["イエスバット話法","Yes, but","部分同意"],"related_theory_ids":["kb_1152","kb_934","kb_412"],"display_id":99,"taxonomy_order":15,"knowledge_type":"method","provenance":{"note":"共通点の明示と相手の視点の承認に関する研究を背景資料として参照。本文の例は編集部による。","works":["Conversational receptiveness: Improving engagement with opposing views (2020)"],"status":"書誌確認済み","sources":[{"url":"https://doi.org/10.1016/j.obhdp.2020.03.011","title":"Conversational receptiveness: Improving engagement with opposing views (2020)"}],"attribution":"Michael Yeomansほか（関連研究）"}}
,{"id":"kb_1152","title":"イエス・アンド話法","summary":"相手が出した案の使える部分を受け取り、具体的な提案を加えて発展させる方法。\n「説明会を短くしよう」に「いいね。冒頭で要点を示して、質問は最後にまとめよう」と返す。即興演劇で使われる考え方で、企画初期の案出しにも応用できる。実行を決める段階では、費用や時間などの条件をあらためて確かめる。","aliases":["イエスアンド話法","Yes, and","イエス・アンド"],"related_theory_ids":["kb_1151","kb_412"],"display_id":100,"taxonomy_order":16,"knowledge_type":"method","provenance":{"note":"即興演劇の原則を発想の場へ応用する実践例を参照。","works":["Lead Change"],"status":"書誌確認済み","sources":[{"url":"https://www.secondcity.com/lead-change","title":"Lead Change"}],"attribution":"The Second City（実践団体）"}}
,{"id":"kb_1153","title":"トゥールミン・モデル","summary":"主張を、根拠、その根拠が主張を支える理由、主張の強さや例外などに分けて検討する論証のモデル。\n「昼は受付を二人に増やす」という主張なら、待ち時間の記録が根拠、対応が追いつかない時間帯には人員追加で待ち時間が短くなるという見立てが、根拠と主張を結ぶ理由になる。機器の故障など、人員を増やしても改善しない場合も確かめる。","aliases":["トゥールミンモデル","Toulmin model","トゥールミンの論証モデル"],"related_theory_ids":["kb_929","kb_932","kb_934"],"display_id":101,"taxonomy_order":17,"knowledge_type":"model","provenance":{"note":"論証を構成する要素を扱った原著を参照。受付の例は編集部による。","works":["The Uses of Argument, III. The Layout of Arguments"],"status":"書誌確認済み","sources":[{"url":"https://doi.org/10.1017/CBO9780511840005.007","title":"The Uses of Argument, III. The Layout of Arguments"}],"attribution":"Stephen E. Toulmin（原著）"}}
]$catalog$::jsonb) as t(
  id text, title text, summary text, aliases jsonb, related_theory_ids jsonb, display_id integer,
  taxonomy_order integer, knowledge_type text, provenance jsonb
);

-- Lock only the affected articles. Refuse to overwrite newer CMS copy.
select id from public.techniques
where id in (select id from dialogue_technique_edits union select id from dialogue_technique_merges)
order by id for update;

do $verify$
begin
  if exists (
    select 1 from dialogue_technique_edits e left join public.techniques t using (id)
    where (e.previous_hash is not null and (
      t.id is null or t.status <> 'published' or t.persona_id is distinct from '一緒にいて疲れない人'
      or md5(t.title || '|' || t.essence || '|' || t.explanation) not in (
        e.previous_hash, md5(e.title || '|' || e.essence || '|' || e.explanation)
      )
    )) or (e.previous_hash is null and t.id is not null and (
      t.title is distinct from e.title or t.status <> 'published' or t.persona_id is distinct from '一緒にいて疲れない人'
    ))
  ) or exists (
    select 1 from dialogue_technique_merges m left join public.techniques t using (id)
    where t.id is null or t.persona_id is distinct from '一緒にいて疲れない人'
      or t.status not in ('published', 'archived')
      or md5(t.title || '|' || t.essence || '|' || t.explanation) <> m.previous_hash
  ) then
    raise exception 'Technique source changed after editorial review';
  end if;
  if exists (
    select 1 from dialogue_theory_additions a join public.theories t using (id)
    where t.title is distinct from a.title or t.status <> 'published' or t.subcategory_id is distinct from 'strategy-l'
  ) then
    raise exception 'A new theory ID is already in use';
  end if;
end
$verify$;

insert into public.theories (
  id, title, summary, category_id, category_title, subcategory_id, taxonomy_order,
  display_id, display_order, aliases, related_theory_ids, canonical_id, legacy_ids,
  knowledge_type, provenance, access_tier, status
)
select id, title, summary, 'strategy', '戦略論', 'strategy-l', taxonomy_order,
  display_id, display_id, aliases, '[]'::jsonb, id, '[]'::jsonb, knowledge_type, provenance, 'complete', 'published'
from dialogue_theory_additions
on conflict (id) do nothing;

insert into public.theory_relations (source_id, target_id, relation_type, review_status, rationale, priority)
select source_id, target_id, relation_type, 'confirmed', rationale, 100
from jsonb_to_recordset($catalog$
[{"source_id":"kb_1151","target_id":"kb_1152","relation_type":"contrasts","rationale":"共通点を出発点に、懸念を検討する話法と、案を発展させる話法を使い分ける。"}
,{"source_id":"kb_1151","target_id":"kb_934","relation_type":"complements","rationale":"同意できる条件と懸念が残る条件を、結論に必要な条件と照らして確認できる。"}
,{"source_id":"kb_1151","target_id":"kb_412","relation_type":"complements","rationale":"相手の発言を短く言い換えると、何に同意し、どこを確認したいかを伝えやすくなる。"}
,{"source_id":"kb_1152","target_id":"kb_412","relation_type":"complements","rationale":"相手が何を提案したかを確かめると、使える部分を拾い、具体案を加えられる。"}
,{"source_id":"kb_1153","target_id":"kb_929","relation_type":"contrasts","rationale":"前提から結論が必然的に導かれる形と、例外のある実践の論証を比較できる。"}
,{"source_id":"kb_1153","target_id":"kb_932","relation_type":"complements","rationale":"例外を明示し、どの観察が主張の見直しにつながるかを考えられる。"}
,{"source_id":"kb_1153","target_id":"kb_934","relation_type":"complements","rationale":"根拠が結論を支えるために、どの条件が必要かを確かめられる。"}
]$catalog$::jsonb)
  as r(source_id text, target_id text, relation_type text, rationale text)
on conflict (source_id, target_id) do nothing;

-- Keep the order of the new cards' related entries aligned with the bundled catalog.
update public.theories t set related_theory_ids = a.related_theory_ids
from dialogue_theory_additions a
where t.id = a.id and t.related_theory_ids @> a.related_theory_ids
  and a.related_theory_ids @> t.related_theory_ids and t.related_theory_ids <> a.related_theory_ids;

update public.techniques t
set title = e.title, essence = e.essence, explanation = e.explanation,
  practices = e.practices, cautions = e.cautions, updated_at = now()
from dialogue_technique_edits e
where t.id = e.id and e.previous_hash is not null
  and (t.title, t.essence, t.explanation, t.practices, t.cautions)
      is distinct from (e.title, e.essence, e.explanation, e.practices, e.cautions);

insert into public.techniques (
  id, persona_id, category, title, essence, explanation, importance, practices, examples,
  cautions, theory_ids, primary_theory_ids, tags, status, display_order, access_tier
)
select e.id, p.name, p.category, e.title, e.essence, e.explanation, e.importance,
  e.practices, e.examples, e.cautions, e.theory_ids, e.primary_theory_ids, e.tags, 'published',
  greatest(e.display_order, coalesce((select max(t.display_order) + 1 from public.techniques t where t.persona_id = p.name and t.status = 'published'), 1)),
  p.access_tier
from dialogue_technique_edits e
join public.personas p on p.name = '一緒にいて疲れない人' and p.status = 'published'
where e.previous_hash is null
on conflict (id) do nothing;

-- Preserve the rows and their original IDs for the editorial archive.
update public.techniques t set status = 'archived', display_order = null, draft_display_order = null, updated_at = now()
from dialogue_technique_merges m
where t.id = m.id and t.status = 'published';

commit;
