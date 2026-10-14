-- Expand the existing editorial guide model; no new tables or article content changes.
alter table public.editorial_characters drop constraint editorial_characters_image_path_check;
alter table public.editorial_characters add constraint editorial_characters_image_path_check
 check (image_path is null or image_path in ('bundled:sumino-haruka','bundled:sakaki-naoto','bundled:onose-tsumugi') or image_path like 'feature/%');

insert into public.editorial_characters(id,name,role,bio,interests,image_path,image_alt,status,display_order) values
 ('sakaki-naoto','榊 直人','処世術禄 編集案内人','選ぶこと、手放すこと、続けること。日々の判断を手がかりに、仕事と人生の選択を考えます。',array['生き方・選択','意思決定','仕事','実践','人生哲学'],'bundled:sakaki-naoto','榊直人のイラスト','published',20),
 ('onose-tsumugi','小野瀬 紬','処世術禄 編集案内人','世の中の「当たり前」は、どこから来るのか。社会の変化と私たちの感じ方をつなぎ、人間の振る舞いを読み解きます。',array['社会・時代','SNS','社会的比較','文化','価値観'],'bundled:onose-tsumugi','小野瀬紬のイラスト','published',30)
on conflict(id) do nothing;

-- Preserve any manual reassignment; distribute only the original initial guide links.
update public.feature_articles set editorial_character_id='sakaki-naoto'
 where editorial_character_id='sumino-haruka' and slug in ('five-guidelines','passion-and-cynicism');
update public.feature_articles set editorial_character_id='onose-tsumugi'
 where editorial_character_id='sumino-haruka' and slug='the-secret-behind-age';
update public.editorial_characters set image_alt='澄野遥のイラスト'
 where id='sumino-haruka' and image_alt='澄野遥を表現した、穏やかな表情の架空の編集案内人のイラスト';
