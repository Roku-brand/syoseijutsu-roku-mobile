-- Retire the entire old practical-wisdom catalogue, not an additive import.
-- New application-assigned UUIDs are immutable identity keys; display IDs remain editable.
-- All work is atomic in the migration runner's transaction. Historical migrations stay unchanged.
set local lock_timeout = '5s';
set local statement_timeout = '60s';
select pg_advisory_xact_lock(hashtextextended('theory-display-id',0));

create temporary table practical_retired_ids(id text primary key, title text) on commit drop;
insert into practical_retired_ids select id,title from unnest(array['kb_636','kb_670','kb_655','kb_637','kb_662','kb_648','kb_674','kb_650','kb_705','kb_651','kb_704','kb_665','kb_657','kb_330','kb_647','kb_661','kb_642','kb_338','kb_666','kb_633','kb_645','kb_331','kb_640','kb_671','kb_634','kb_656','kb_659','kb_643','kb_638','kb_654','kb_668','kb_660','kb_669','kb_649','kb_703','kb_652','kb_653','kb_672','kb_646','kb_639','kb_658','kb_673','kb_664','kb_663','kb_667','kb_635','kb_644','kb_641']::text[],array['「新しい道には、失敗から学ぶ余地がある」','「安心のために、可能性を狭めすぎない」','「行き詰まったら、別の手段を試してみる」','「一度の出来事に、人生の結論を預けない」','「動かないことで失う機会も、リスクに数える」','「動きながら、少しずつ形を磨く」','「生んだ価値を、周囲への貢献でも測る」','「恐れの大きさだけで、機会を閉じない」','「落ち着きを保ち、できることから動き出す」','「変えられる一歩へ、意識を戻す」','「過去の傷は、急がず付き合い方を学ぶ」','「過去の努力より、これからの適合を選ぶ」','「過去の弁明より、次の行動に力を使う」','「形にして初めて、直す場所が見える」','「考える時間を区切り、決める時を持つ」','「考えを確かめるなら、小さく試してみる」','「傷つく可能性を知り、挑み方を選ぶ」','「比べるなら、見ている範囲をそろえる」','「敬意を欠く場面には、境界を引いてよい」','「経験の意味は、歩いた後から育つ」','「結果を案じるより、今日の一歩を整える」','「行動は、起こりやすい環境から変わる」','「才は、習慣と忍耐によって育つ」','「時間と縁に、自分で余白を残しておく」','「時間の使い方に、自分の価値観を映す」','「姿勢と熱意と力の向きが、結果を形づくる」','「自然体でいられる縁を、丁寧に育てる」','「失敗の記録から、次の工夫を拾い上げる」','「失敗は、守りたいものを照らすことがある」','「自分らしさを、周囲の型に押し込まない」','「好きなものへの熱を、理由なく隠さない」','「成果だけで、自分の居場所を決めない」','「成果の陰にある試行も、成功の一部と見る」','「制約の中に、工夫の入口を探す」','「惰性に気づいたら、時間の使い道を選び直す」','「違いを磨けば、その人ならではの価値になる」','「努力だけでなく、場と相性も問い直す」','「望みを曖昧にせず、正面から向き合う」','「伸びしろは、見直す目の中にある」','「ひとつの失点を、次の一手に持ち越さない」','「人を大切にする歩みも、成果に数える」','「批判を避けることだけを、選択の基準にしない」','「評するだけでなく、手を動かして確かめる」','「学びを残す挑戦を、失敗ごと選び取る」','「未熟だった自分も、成長の道に含める」','「未来の自分が悔やまない選択を考える」','「目先の便利さより、譲れない基準を確かめる」','「休む時間も、続ける計画に入れておく」']::text[]) x(id,title);
create temporary table practical_replacement(id text primary key, display_id integer unique, title text, summary text, access_tier text, provenance jsonb, technique_ids jsonb) on commit drop;
insert into practical_replacement values
('theory-1e056acd-4b69-40d2-95ce-3182dc15315a',1,'「転ぶなら、前で転べ。」','挑戦がうまくいかなかったときにも、試した経験や見えた課題は手元に残る。失敗そのものを目的にせず、次の一歩に使えるものを拾えたなら、その転倒には前進がある。','free','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-329","master336-330"]'::jsonb),
('theory-ba0ccc1b-92c5-48b9-9d1c-9810807d0416',2,'「安全な場所ほど、景色は変わらない。」','慣れた環境は安心をくれる一方、出会う人や経験の幅を静かに狭めることもある。守るものを見極めたうえで小さく外へ出ると、今までの場所からは見えなかった可能性に触れられる。','free','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-327"]'::jsonb),
('theory-a3252859-1363-4fba-b94f-9bc4bdb752d8',3,'「道がないなら、曲がればいい。」','目指す場所へ一直線に進めないことと、そこへ行けないことは同じではない。手段や順序を変える余地を探すと、行き止まりに見えた場所が別の道の入口になる。','free','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'[]'::jsonb),
('theory-4f18f89d-592b-418d-a57e-9a5ab75a3ff8',4,'「何もしなかった日にも、値札はついている。」','行動には失敗の費用があるが、動かない間にも時間や機会は失われている。何もしない選択を無料だと思わず、得られる安心と手放す可能性を一緒に見つめる。','free','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-302"]'::jsonb),
('theory-d412a6b9-22f8-4007-b96c-43e7061c4b42',5,'「未完成は、まだ生きている。」','出来上がっていないものには、まだ問い直したり作り替えたりする余地がある。完成を待って抱え込むより、途中の形を外に出して反応を受け取ることで、考えは育ち続ける。','free','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-175"]'::jsonb),
('theory-cd7acf77-8b00-45b9-adfb-f0d3789122b6',6,'「急ぐな。でも、今日を逃すな。」','焦りに押されて大きな決断をする必要はないが、すべてを先送りしてよいわけでもない。今しか会えない人や今なら試せることに目を向け、落ち着いたまま今日の一歩を踏み出す。','free','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-257"]'::jsonb),
('theory-f8329abb-6906-47bb-8dff-85a98adedb64',7,'「考えているうちに、季節が変わる。」','考え続ける間にも、相手の状況や自分の体力、選べる機会は変わっていく。判断に必要な材料を集める時間と、迷いを繰り返している時間を分け、決める時期を持つ。','free','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-305"]'::jsonb),
('theory-9ad49f9a-e7dd-4b4e-8014-abc9045dd0e3',8,'「答えは、靴の裏にくっついている。」','自分に合うかどうかや現場で何が起きるかは、頭の中だけでは確かめきれない。小さく動いて持ち帰った手触りが、次に考えるための具体的な材料になる。','free','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-304"]'::jsonb),
('theory-196d34ef-6d9c-489a-9282-dc38243df12a',9,'「無傷で帰るつもりなら、遠くへは行けない。」','新しい場所へ進むときには、失敗や気まずさ、期待が外れる痛みを完全には避けられない。無謀さを肯定する言葉ではなく、守るべき安全を確保したうえで、挑戦に伴う不確かさを引き受ける姿勢を示している。','free','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'[]'::jsonb),
('theory-beebd375-bb7f-4aa0-b21d-8fbb4714c1b1',10,'「客席からなら、誰でも名将だ。」','結果を知った後の批評は、情報も責任も足りなかった当事者の判断より簡単に見える。自分で手を動かして制約に触れると、外からの正論だけでは見えなかった難しさや工夫が分かる。','free','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'[]'::jsonb),
('theory-152eda9d-6bb1-462e-9aeb-61f904f7038b',11,'「嫌われない人生は、誰にも届かない。」','誰からも反対されないことを優先すると、自分の意思や伝えたいことが薄くなる。相手への敬意は保ちながらも、すべての人の好意を条件にせず、届けたい相手へ言葉や行動を差し出す。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-098","master336-278"]'::jsonb),
('theory-b6565cc5-277c-48c7-9129-68b2f4cbf0a0',12,'「一回負けただけだ。続きを勝手に負けるな。」','一度の失敗が教えてくれるのは、その試みの結果であって、これからの人生すべての結末ではない。落ち込む時間はあっても、その先の挑戦まで敗北したものとして扱わない。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-312"]'::jsonb),
('theory-6efbfb85-85f7-4978-8bfd-52cbe3cbf05e',13,'「傷は、消えなくても邪魔じゃなくなる。」','つらい経験を忘れられないことと、その経験に毎日を支配され続けることは同じではない。時間や支えを得ながら距離の取り方を覚えると、記憶が残っていても新しい生活を築いていける。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-314"]'::jsonb),
('theory-b7f5750c-b9d7-485a-ac3e-42bafffb9be0',14,'「昨日に口はいらない。明日に手を出せ。」','過去を説明し直すことに力を使い続けても、これからの状況はそれだけでは変わらない。必要な振り返りを終えたら、言い訳や自己弁護より、次に変えられる具体的な行動へ力を戻す。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'[]'::jsonb),
('theory-d9f695d5-7595-4236-a991-b6a3cf5b7ddb',15,'「意味は、だいたい後から来る。」','経験の価値は、その瞬間には分からないことがある。後に出会う人や別の経験と結びついて意味が育つため、今すぐ役立つかどうかだけで歩いた時間を切り捨てない。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'[]'::jsonb),
('theory-a1d88571-e3f5-4383-b757-d4010025befa',16,'「失敗は、燃やすな。持って帰れ。」','失敗を恥として隠すだけでは、同じ条件が次にも残ってしまう。何が起きたかを記録し、判断や仕組みのどこを変えられるかを持ち帰れば、その経験を次の工夫に使える。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-179"]'::jsonb),
('theory-b181b908-e671-4dcc-b1ca-5acfab6dc431',17,'「なくしてから、名前がつくものもある。」','失って初めて、自分を支えていたものや大切にしていた気持ちがはっきりすることがある。喪失をよい出来事へ無理に言い換えず、そこで気づいた価値をこれからの暮らしに置き直す。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'[]'::jsonb),
('theory-65d2d01f-38fc-4557-b7f8-bb0665d07426',18,'「昔の自分を、他人みたいに嫌うな。」','今の知識や余裕で昔の判断を見ると、当時の自分には見えなかった選択肢まで責めてしまう。その頃に持っていた情報や事情も含めて見直すことは、反省をやめることではなく、自分の歩みを公平に扱うことにつながる。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-310"]'::jsonb),
('theory-f93822fd-a157-47e3-b766-45eb04f3aa87',19,'「一本の当たりの後ろに、墓場がある。」','目に入る成功例の後ろには、表に出なかった試行や失敗が積み重なっていることがある。成果だけを見て簡単に再現できると思わず、続けるための資源や失敗の幅も含めて考える。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'[]'::jsonb),
('theory-89aeaa0c-c78d-4ae6-9d5b-c0d4b2ca7d68',20,'「遠くを見る日は、足元を忘れるな。」','将来の目標は進む方向を教えてくれるが、今日の生活や身近な人を支えるものまで代わりに守ってはくれない。遠い成果を望むときほど、今の体力、暮らし、約束といった足元の条件にも目を配る。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'[]'::jsonb),
('theory-d923799a-26ec-4db9-b0ed-7777497244ae',21,'「頑張っても沈む船はある。」','努力の量だけでは、合わない環境や成り立たない仕組みを立て直せないことがある。続ける根性を問う前に、進む場所や方法が適切かを確かめ、離れる選択も検討する。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-269"]'::jsonb),
('theory-a750353b-c60f-44fc-b30b-54c1a1466079',22,'「他人の一枚と、自分の全部を比べるな。」','人の発信や目立つ成果は、その人の生活の一部分にすぎない。自分の疲れや失敗まで含む全体と、他人の選ばれた場面を同じ条件だと思って比べない。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'[]'::jsonb),
('theory-8c2a3b15-0f6d-4225-abda-07eba8eccc4a',23,'「最後に振り返る自分を、今の会議に呼べ。」','目先の得失だけで決めると、後から大切だったと分かる時間や関係を見落とすことがある。人生を振り返る自分なら何を惜しむかを想像し、今の判断に長い時間の物差しを加える。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-299"]'::jsonb),
('theory-6f51e173-64ce-43d1-b64b-92aa5b9794c6',24,'「便利は借りても、軸は貸すな。」','便利な道具や人の助言は、考える手間を減らしてくれる。何を大切にしてどこまで任せるかまで明け渡さず、最終的な判断の基準は自分の言葉で持っておく。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-268"]'::jsonb),
('theory-ea4dfb6c-4442-477a-aa71-a3581d201131',25,'「財布より先に、時間がその人を語る。」','大切だと言うものより、実際に時間を使っている先に優先順位が表れることがある。忙しさを埋めるだけでなく、限りある時間が自分の大切な人や活動へ届いているかを見直す。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-255","master336-256"]'::jsonb),
('theory-116d47d4-5388-45a1-b6d7-986369be20d0',26,'「欠点は、角度を変えると輪郭になる。」','ある場では扱いにくい性質が、別の役割や環境ではその人ならではの強みになることがある。欠点を消すことだけに力を使わず、違いが価値として働く角度や場所を探す。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-270"]'::jsonb),
('theory-ab322059-b04a-4e2f-8c43-141492063021',27,'「好きなら、少しくらい馬鹿になれ。」','好きなものに夢中になる時間は、効率や収益だけでは測れない。暮らしを壊すほどの無理は避けながら、役に立つ理由を毎回求めず、心が動くことへ少し余白を渡す。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-281"]'::jsonb),
('theory-f7fc74ff-d2d1-4254-9135-a2772f36ccf3',28,'「ここにいていい理由を、毎日稼ぐな。」','成果や気遣いを出し続けなければ居場所がなくなると感じると、休むことも本音を出すことも難しくなる。貢献する喜びとは別に、何も成し遂げない日にも自分の存在を否定しなくてよい関係や場所を持つ。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-276"]'::jsonb),
('theory-bc043984-1d19-4b66-9a5b-f16471ea9c76',29,'「満足は、たまに目を曇らせる。」','うまくいっているという感覚が強いほど、変化や小さな不具合を見逃すことがある。満足を味わうことは大切にしながら、ときどき外の反応や以前とは違う条件を確かめ、惰性に気づく余地を残す。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'[]'::jsonb),
('theory-ea328bdf-a483-4048-9a88-356239325011',30,'「持って帰るな。何か置いていけ。」','その場で何を得たかだけでなく、自分が去った後に何が残るかにも目を向ける。知識を渡す、場を整える、誰かの負担を軽くするといった小さな貢献も、その時間の価値になる。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-263"]'::jsonb),
('theory-9aef21ca-b8ff-48d5-93cc-5adb7bd329dd',31,'「雑に扱われる場所に、長居するな。」','無礼や軽視に慣れてしまうと、自分の感覚まで疑うようになることがある。関係を保つために傷つく役を引き受け続けず、境界を伝えたり距離を取ったりする余地を確保する。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-116"]'::jsonb),
('theory-c1e25b20-5ff7-47b4-8585-72606829f758',32,'「頑張らないと続かない縁は、だいたい遠い。」','一時的な支え合いとは違い、いつも片方だけが無理をして保つ関係では、近さより消耗が積み重なる。付き合いの長さだけで判断せず、自然体で会えるか、負担を互いに調整できるかを見つめる。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-128"]'::jsonb),
('theory-1a1a5e84-191d-4002-9d09-586f422e606a',33,'「自分を変えるより、机を変えろ。」','行動が続かない原因を性格や意志の弱さだけに求めると、変えられる条件を見逃す。座る場所、周囲の人、道具の置き方などを変えるだけで、無理なく動ける流れが生まれることがある。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-318"]'::jsonb),
('theory-0a93dca8-aa3d-4636-b42c-0d1db8f10aa0',34,'「才能は、放っておくとただの原石だ。」','得意な性質があっても、試す機会や繰り返し磨く時間がなければ、使える力には育ちにくい。才能の有無を決めつけるより、続けられる習慣やフィードバックを受け取れる場を整える。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-336"]'::jsonb),
('theory-5c03b393-8849-4e74-a58c-30ed430fcf4c',35,'「止まる日も、旅の途中だ。」','進んでいないように見える休息や立て直しの時間も、長く歩くための過程に含まれる。毎日の成果だけで旅の価値を測らず、体力や気持ちを回復させる時間を認める。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-314"]'::jsonb),
('theory-665760d5-914e-41d3-af31-7c74dd28d909',36,'「山頂ばかり見ていると、道端の花を見過ごす。」','達成や成長ばかりを追い続けると、途中の日常にある小さな幸福や人との時間を見落とすことがある。人生の価値は到達点だけでなく、そこへ向かう経験そのものにもある。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-252","master336-254"]'::jsonb),
('theory-8cbf5a5e-3de7-4c97-be53-579fca58b5c0',37,'「自分のためだけに積んだものは、案外軽い。」','利益や評価、所有が増えても、それだけでは満たされないことがある。他者や社会へ何を渡し、誰の暮らしに何を残したかという尺度を持つと、積み重ねの意味を別の角度から確かめられる。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-263"]'::jsonb),
('theory-de584411-ca8e-4a8e-a53c-e1f36436c42d',38,'「健康は、失ってから急に主役になる。」','健康は普段は背景にあるが、仕事、遊び、人間関係を含むほぼすべての活動の土台になっている。失ってからその重さに気づく前に、日々の休息や体調に目を向け、ほかの成果と同じように大切に扱う。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-261"]'::jsonb),
('theory-18c606ea-e115-4971-9f3a-017fb6a6d753',39,'「最後まで残るものは、案外、誰と笑ったかだ。」','人生を振り返るとき、成果や所有物だけでなく、誰かと笑い合った時間や支え合った関係も価値として残る。大切な人とのひとときを、余裕ができてからの後回しにしない。','complete','{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb,'["master336-259","master336-260"]'::jsonb);

do $guard$
begin
 if (select count(*) from public.theories where category_id='practical-wisdom')<>48
   or exists(select 1 from public.theories t where t.category_id='practical-wisdom' and not exists(select 1 from practical_retired_ids r where r.id=t.id))
   or exists(select 1 from practical_retired_ids r where not exists(select 1 from public.theories t where t.id=r.id and t.category_id='practical-wisdom')) then
   raise exception 'Practical-wisdom catalogue changed; review before replacing it.';
 end if;
 if exists(select 1 from practical_replacement n join public.theories t on t.id=n.id) then raise exception 'Replacement identity collision.'; end if;
 if exists(select 1 from practical_replacement n cross join lateral jsonb_array_elements_text(n.technique_ids) x where not exists(select 1 from public.techniques t where t.id=x and t.status='published')) then raise exception 'Related technique is not published.'; end if;
end $guard$;

-- Session-local helper also sanitizes restore snapshots, so CMS cannot revive dead links.
create or replace function pg_temp.strip_retired_practical(value jsonb) returns jsonb
language plpgsql set search_path = pg_catalog, pg_temp as $clean$
declare result jsonb; entry record; cleaned jsonb;
begin
 if value is null then return null; end if;
 if jsonb_typeof(value)='string' then
  if exists(select 1 from practical_retired_ids where id=value#>>'{}' or title=value#>>'{}') then return null; end if;
  return value;
 elsif jsonb_typeof(value)='array' then
  result:='[]'::jsonb;
  for entry in select x from jsonb_array_elements(value) e(x) loop
   cleaned:=pg_temp.strip_retired_practical(entry.x);
   if cleaned is not null then result:=result||jsonb_build_array(cleaned); end if;
  end loop;
  return result;
 elsif jsonb_typeof(value)='object' then
  if exists(select 1 from practical_retired_ids where id=coalesce(value->>'tagId',value->>'id')) then return null; end if;
  result:='{}'::jsonb;
  for entry in select key,val from jsonb_each(value) e(key,val) loop
   cleaned:=pg_temp.strip_retired_practical(entry.val);
   if cleaned is not null then result:=result||jsonb_build_object(entry.key,cleaned); end if;
  end loop;
  return result;
 end if;
 return value;
end $clean$;

update public.popular_rankings set content_ids=pg_temp.strip_retired_practical(content_ids),updated_at=now()
where content_ids is distinct from pg_temp.strip_retired_practical(content_ids);
update public.techniques set theory_ids=pg_temp.strip_retired_practical(theory_ids),
 primary_theory_ids=pg_temp.strip_retired_practical(primary_theory_ids),updated_at=now()
where theory_ids is distinct from pg_temp.strip_retired_practical(theory_ids)
 or primary_theory_ids is distinct from pg_temp.strip_retired_practical(primary_theory_ids);
update public.theories set related_theory_ids=pg_temp.strip_retired_practical(related_theory_ids),updated_at=now()
where related_theory_ids is distinct from pg_temp.strip_retired_practical(related_theory_ids);
update public.technique_drafts set snapshot=pg_temp.strip_retired_practical(snapshot)
where snapshot is distinct from pg_temp.strip_retired_practical(snapshot);
update public.technique_revisions set snapshot=pg_temp.strip_retired_practical(snapshot)
where snapshot is distinct from pg_temp.strip_retired_practical(snapshot);
update public.technique_change_log set snapshot=pg_temp.strip_retired_practical(snapshot)
where snapshot is distinct from pg_temp.strip_retired_practical(snapshot);
update public.theory_link_optimization_backups set previous_theory_ids=pg_temp.strip_retired_practical(previous_theory_ids),optimized_theory_ids=pg_temp.strip_retired_practical(optimized_theory_ids)
where previous_theory_ids is distinct from pg_temp.strip_retired_practical(previous_theory_ids)
 or optimized_theory_ids is distinct from pg_temp.strip_retired_practical(optimized_theory_ids);
-- Analytics referring only to removed theory identities cannot be used for recommendations.
delete from public.content_events where content_type='theory' and content_id in(select id from practical_retired_ids);
update public.operation_social_posts set source_theory_id=null where source_theory_id in(select id from practical_retired_ids);
delete from public.theories where id in(select id from practical_retired_ids);

create or replace function public.validate_theory_content() returns trigger
language plpgsql security definer set search_path = public as $validate$
declare category_name text;
begin
 select title into category_name from public.content_categories where kind='theory' and id=new.category_id;
 if category_name is null then raise exception '理論カテゴリを選択してください。' using errcode='22023'; end if;
 new.category_title:=category_name;
 if new.category_id='practical-wisdom' and new.status='draft' and new.provenance is null then
  new.provenance:='{"status":"オリジナル","attribution":"処世術禄","works":["処世術禄オリジナル"],"sources":[],"note":"処世術禄によるオリジナルの実践知です。"}'::jsonb;
 end if;
 if new.status='published' and (nullif(trim(new.title),'') is null or nullif(trim(new.summary),'') is null) then
  raise exception 'タイトルと概要は公開に必須です。' using errcode='22023';
 end if;
 if jsonb_typeof(new.aliases)<>'array' or jsonb_typeof(new.related_theory_ids)<>'array' then raise exception '別名と関連理論の形式が不正です。' using errcode='22023'; end if;
 if new.related_theory_ids ? new.id then raise exception '自分自身を関連理論に指定できません。' using errcode='22023'; end if;
 if new.provenance is not null then
  if coalesce(new.provenance->>'status','') not in ('オリジナル','確認済み','書誌確認済み','一部確認','出典不明') then raise exception '出典状態を選択してください。' using errcode='22023'; end if;
  if jsonb_typeof(coalesce(new.provenance->'sources','[]'::jsonb))<>'array' then raise exception '参照先の形式が不正です。' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(new.provenance->'sources','[]')) s where coalesce(s->>'url','') !~ '^https://[^[:space:]]+$' or nullif(trim(s->>'title'),'') is null) then raise exception '参照先には名称とhttpsのURLを入力してください。' using errcode='22023'; end if;
 end if;
 if new.category_id='practical-wisdom' and new.status='published' then
  if new.title !~ '^「[^「」]+」$' or new.provenance is null
    or new.provenance->>'status' is distinct from 'オリジナル'
    or new.provenance->>'attribution' is distinct from '処世術禄'
    or new.provenance->'works' is distinct from '["処世術禄オリジナル"]'::jsonb
    or new.provenance->>'note' is distinct from '処世術禄によるオリジナルの実践知です。'
    or coalesce(new.provenance->'sources','[]'::jsonb)<>'[]'::jsonb
    or nullif(new.provenance->>'period','') is not null then
   raise exception '実践知は「」形式のタイトルと処世術禄オリジナルの出典を設定してください。' using errcode='22023';
  end if;
 end if;
 return new;
end $validate$;

insert into public.theories(id,title,summary,category_id,category_title,aliases,related_theory_ids,status,display_id,display_order,access_tier,provenance)
select id,title,summary,'practical-wisdom','実践知','[]','[]','published',display_id,display_id,access_tier,provenance from practical_replacement order by display_id;
-- Append independently reviewed new edges. Preserve all unrelated existing edges and primary theories.
with links as (
 select x.technique_id,jsonb_agg(n.id order by n.display_id) ids
 from practical_replacement n cross join lateral jsonb_array_elements_text(n.technique_ids) x(technique_id) group by x.technique_id
)
update public.techniques t set theory_ids=t.theory_ids||l.ids,updated_at=now() from links l where t.id=l.technique_id;
-- Canonical triggers sync theory/technique paid rows; remove any remaining legacy payload references.
update public.paid_content set payload=pg_temp.strip_retired_practical(payload),updated_at=now()
where payload is distinct from pg_temp.strip_retired_practical(payload);

do $assert$
begin
 if (select count(*) from public.theories where category_id='practical-wisdom')<>39 then raise exception 'Expected only the new 39 practical items.'; end if;
 if exists(select 1 from practical_replacement n left join public.theories t on t.id=n.id where t.id is null or t.title<>n.title or t.summary<>n.summary or t.provenance<>n.provenance or t.display_id<>n.display_id or t.status<>'published') then raise exception 'Canonical replacement mismatch.'; end if;
 if exists(select 1 from public.techniques t cross join lateral jsonb_array_elements_text(t.theory_ids) x where not exists(select 1 from public.theories where id=x)) then raise exception 'Dead technique theory reference.'; end if;
 if exists(select 1 from public.theories t cross join lateral jsonb_array_elements_text(t.related_theory_ids) x where not exists(select 1 from public.theories where id=x)) then raise exception 'Dead theory reference.'; end if;
 if exists(select 1 from public.paid_content where content_type='theory' and content_id in(select id from practical_retired_ids)) then raise exception 'Retired paid content remained.'; end if;
 if (select count(*) from public.paid_content p join practical_replacement n on p.content_type='theory' and p.content_id=n.id where n.access_tier='complete' and p.payload->>'summary'=n.summary)<>29 then raise exception 'Paid catalogue replacement mismatch.'; end if;
end $assert$;
