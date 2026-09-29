-- Generated from the shipped public catalog and persona image map.
-- This preserves the current free/complete boundary while making it editable in DB.
update public.techniques set access_tier='complete' where access_tier<>'complete';
update public.techniques set access_tier='free' where id in ('master336-001','master336-002','master336-003','master336-004','master336-005','master336-006','master336-007','master336-008','master336-009','master336-010','master336-011','master336-012','master336-013','master336-014','master336-050','master336-051','master336-052','master336-053','master336-054','master336-055','master336-056','master336-057','master336-058','master336-059','master336-060','master336-061','master336-062','master336-063','master336-064','master336-065','master336-066','master336-067','master336-068','master336-069','master336-070','master336-071','master336-072','master336-172','master336-173','master336-174','master336-175','master336-176','master336-177','master336-178','master336-179','master336-180','master336-181','master336-182','master336-183','master336-184','master336-185','master336-186','master336-187','master336-188','master336-189','master336-190','master336-191','master336-192','master336-193','master336-194','master336-195','master336-196','master336-197','master336-198','master336-199','master336-200','master336-250','master336-251','master336-252','master336-253','master336-254','master336-255','master336-256','master336-257','master336-258','master336-259','master336-260','master336-261','master336-262','master336-263','master336-264','master336-265','master336-266','master336-267','master336-268','master336-269','master336-270','master336-271','master336-272','master336-273','master336-274','master336-275','master336-276','master336-277','master336-278');
update public.theories set access_tier='complete' where access_tier<>'complete';
update public.theories set access_tier='free' where id in ('kb_001','kb_002','kb_003','kb_004','kb_007','kb_008','kb_014','kb_017','kb_019','kb_025','kb_028','kb_029','kb_036','kb_041','kb_045','kb_047','kb_050','kb_051','kb_053','kb_092','kb_093','kb_094','kb_095','kb_203','kb_213','kb_216','kb_219','kb_221','kb_225','kb_231','kb_232','kb_233','kb_239','kb_240','kb_263','kb_264','kb_265','kb_266','kb_268','kb_269','kb_389','kb_391','kb_098','kb_099','kb_100','kb_102','kb_104','kb_105','kb_133','kb_134','kb_135','kb_136','kb_137','kb_138','kb_140','kb_167','kb_169','kb_172','kb_175','kb_177','kb_179','kb_180','kb_190','kb_191','kb_273','kb_275','kb_402','kb_058','kb_060','kb_063','kb_064','kb_066','kb_067','kb_070','kb_072','kb_073','kb_077','kb_082','kb_107','kb_109','kb_111','kb_123','kb_192','kb_193','kb_554','kb_567','kb_599','kb_543','kb_545','kb_142','kb_143','kb_162','kb_278','kb_282','kb_283','kb_284','kb_286','kb_287','kb_296','kb_298','kb_299','kb_300','kb_301','kb_304','kb_311','kb_315','kb_324','kb_326','kb_327','kb_329','kb_333','kb_335','kb_336','kb_352','kb_353','kb_359','kb_604','kb_612','kb_614','kb_616','kb_617','kb_618','kb_619','kb_620','kb_621','kb_623','kb_624','kb_625','kb_626','kb_627','kb_629','kb_631','kb_632','kb_330','kb_633','kb_634','kb_635','kb_638','kb_645','kb_647','kb_654','kb_661','kb_669','kb_706','kb_724','kb_729','kb_736','kb_738','kb_762','kb_790');
update public.techniques set status='draft' where id in ('master336-337','master336-338','master336-339','master336-340','master336-341','master336-342','master336-343','master336-344','master336-345','master336-346','master336-347','master336-348','master336-349','master336-350','master336-351','master336-352','master336-353','master336-354','master336-355','master336-356') and status='published';
update public.personas p set subtitle=v.subtitle,image_path=v.image_path,display_order=v.display_order
from (values
 ('印象がいい人','初対面から好感を持たれる振る舞い方','bundled:persona-01.webp',1),
 ('人たらしの人','自然と人の懐に入る距離の縮め方','bundled:persona-02.webp',2),
 ('会話がうまい人','話を広げ、心地よい会話をつくる方法','bundled:persona-03.webp',3),
 ('聞き上手な人','相手が話したくなる聞き方','bundled:persona-04.webp',4),
 ('信頼される人','安心して任せてもらうための振る舞い','bundled:persona-05.webp',5),
 ('面白い人','会話や場を楽しくする話し方と工夫','bundled:persona-06.webp',6),
 ('人を見極められる人','言葉と行動から本質を見抜く観察方法','bundled:persona-07.webp',7),
 ('人に振り回されない人','相手に流されず自分の軸を保つ方法','bundled:persona-08.webp',8),
 ('軽く扱われない人','敬意をもって接してもらう境界線の引き方','bundled:persona-09.webp',9),
 ('人間関係が安定する人','無理なく関係を長く保つための工夫','bundled:persona-10.webp',10),
 ('集団に馴染める人','自分らしさを保ちながら場に溶け込む方法','bundled:persona-11.webp',11),
 ('リーダーシップがある人','人を導き、力を引き出す振る舞い方','bundled:persona-12.webp',12),
 ('カリスマ性のある人','人を惹きつけ、自然に影響を広げる方法','bundled:persona-13.webp',13),
 ('仕事ができる人','成果につながる仕事の進め方','bundled:persona-14.webp',14),
 ('タスク処理がうまい人','優先順位を整え、着実に片づける方法','bundled:persona-15.webp',15),
 ('頭がいい人','複雑な状況を整理し、答えを導く考え方','bundled:persona-16.webp',16),
 ('正しく評価される人','努力と成果を正しく伝える見せ方','bundled:persona-17.webp',17),
 ('交渉がうまい人','双方が納得する合意のつくり方','bundled:persona-18.webp',18),
 ('組織でうまく立ち回れる人','立場や関係を読み、力を発揮する方法','bundled:persona-19.webp',19),
 ('充実した人生を過ごせる人','日々に充足をつくる時間の使い方','bundled:persona-20.webp',20),
 ('自分らしく生きられる人','周囲に流されず自分の基準で選ぶ方法','bundled:persona-21.webp',21),
 ('人生を楽しめる人','日常の中に楽しさを見つける工夫','bundled:persona-22.webp',22),
 ('不安に強い人','不安に飲まれず落ち着きを取り戻す方法','bundled:persona-23.webp',23),
 ('後悔しない人','納得できる選択を重ねる判断方法','bundled:persona-24.webp',24),
 ('立ち直れる人','つまずきから回復し前へ進む方法','bundled:persona-25.webp',25),
 ('可能性を広げられる人','選択肢を増やし未来をひらく工夫','bundled:persona-26.webp',26)
) as v(name,subtitle,image_path,display_order) where p.name=v.name;

