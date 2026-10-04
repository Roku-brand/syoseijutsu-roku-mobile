// One-time editorial import. Indices refer ONLY to the fingerprinted 759-row snapshot.
// Runtime classification uses stable IDs, never keywords or these indices.
import fs from 'node:fs';
import crypto from 'node:crypto';
const root = new URL('../', import.meta.url);
const read = p => JSON.parse(fs.readFileSync(new URL(p, root), 'utf8'));
const write = (p, v) => fs.writeFileSync(new URL(p, root), JSON.stringify(v, null, 2) + '\n');
const source = read('src/data/generated/theories.json');
const hash = crypto.createHash('md5').update([...source].sort((a,b)=>a.tagId.localeCompare(b.tagId)).map(t=>[t.tagId,t.title,t.summary,t.categoryId].join(':')).join('|')).digest('hex');
if (hash !== '041403168f4b650ab737b95454c42ffa' || source.length !== 759) throw Error('Snapshot changed; review against DB before importing.');
const definitions = {
 P: ['psychology', '心理学', {c:'認知',e:'感情',s:'自己',i:'対人',a:'不安',g:'喪失',m:'記憶',t:'心理技法',v:'社会心理',u:'言語'}],
 B: ['behavioral-science','行動科学',{d:'意思決定',x:'選択',h:'習慣',m:'動機づけ',g:'目標達成',e:'行動設計',l:'学習'}],
 O: ['organization-management','組織・経営論',{i:'個人',t:'チーム',l:'リーダーシップ',o:'組織',h:'人事',n:'人脈',p:'権力',m:'経営'}],
 T: ['strategy','戦略論',{a:'分析',j:'判断',n:'交渉',c:'競争',g:'ゲーム',r:'リスク',d:'適応',e:'実行'}],
 A: ['practical-wisdom','実践知',{c:'会話',r:'人間関係',t:'思考',j:'判断',a:'行動',w:'仕事',s:'自己管理',k:'キャリア'}],
 C: ['classics-thought','古典・思想',{e:'東洋思想',w:'西洋思想',b:'兵法',p:'ことわざ',q:'格言',f:'作品'}],
};
const assignment = new Map();
function put(code, indices) {
 for (const index of indices.split(/\s+/).filter(Boolean).map(Number)) {
  if (assignment.has(index)) throw Error(`Repeated index ${index}`);
  assignment.set(index, code);
 }
}
// Read title AND definition for every row; phenomena remain separate from interventions.
put('Pc','6 12 14 17 20 21 25 34 36 43 55 64 83 84 90 92 97');
put('Pe','18 30 35 51 54 56');
put('Ps','1 2 4 19 32 42 44 65');
put('Pi','0 23 38 41 45 46 47 48 59 60 62 67 72 74 75 82 86 91 94 95 98');
put('Pa','11 26 37 53 80 99');
put('Pg','5 15 16 24 28 89');
put('Pm','27 58 81');
put('Pt','7 8 9 10 33 52 57 66 71 76 79');
put('Pv','13 85');
put('Pu','31 73 78');
put('Bm','3 63'); put('Bg','96'); put('Bl','49 50 70');
put('Oi','29'); put('Op','88');
put('Ac','39 40 87'); put('Ar','68 69'); put('Aw','61 77'); put('As','93');
put('Pc','104 118 124 125 137 142 145 147 148 149 150 162 165 174 179 189 192 196 201 209 217 218');
put('Ps','101 111 112 116 117 119 120 121 122 123 132 170 173 175 177 185 186 206 212');
put('Pi','100 102 105 106 107 110 126 128 129 130 133 143 144 153 154 155 157 164 180 182 183 184 187 188 190 193 194 195 199 205 211');
put('Pu','103 131 163 167 171 213 219');
put('Pg','127 134 138 151 181 215');
put('Pa','152 159 161');
put('Pm','113 141 146 166 197 203 216');
put('Pt','135 156 160 176 191 200 202 214');
put('Pv','158');
put('Be','108'); put('Bm','109 115'); put('Bl','139 140 169');
put('Ac','168 198 204'); put('Ar','172'); put('Aj','136'); put('As','114 208'); put('At','178');
put('Cw','207'); put('Oh','210');
put('Pc','220 221 222 226 227 230 234 235 236 238 240 241 242 243 246 254 260 270 293 297 298');
put('Pe','262 288');
put('Ps','249 265 269 284 295');
put('Pi','231 252 253 256 259 261 266 267 273 274 275 286 287 290 292 294');
put('Pu','247 271 278 279');
put('Pa','225 237 245 257 277 289');
put('Pt','224 239 244 248 250 268 272 282 302 303');
put('Pm','228 255 258 264 296 301 304');
put('Bl','232 263'); put('Bg','281'); put('Bm','283'); put('Bd','276');
put('Ac','223 229 291'); put('Aj','251'); put('As','285'); put('Cw','280');
put('Pg','299'); put('Pi','300'); assignment.set(298,'Pi');
put('Bh','305 354 355 398 412');
put('Bd','306 307 311 318 322 325 327 328 330 334 336 339 343 345 347 356 359 361 366 369 373 375 397 402 404 411');
put('Bx','308 310 314 316 323 324 333 337 342 352 368 371 372 377 380 381 384 393 403');
put('Bm','326 329 346 362 363 374 382 407');
put('Bg','317 341 351 365 367 391 394 396 405 406 408');
put('Be','321 340 370 385 388 409');
put('Bl','312 315 320 335 349 386 389');
put('Pm','313 383'); put('Ps','348'); put('Pc','332 358 378 390'); put('Pv','353 360'); put('Pt','338');
put('Tj','357 400 401'); put('Ta','399'); put('Tr','410');
put('Ac','309 387 392 413'); put('Aa','319 344 364'); put('As','350'); put('Aw','379'); put('Ak','376');
put('Oh','414 421 423 434 438 449 484 485 494 499');
put('Ot','416 426 437 467 468 471 472 473 474 476 497');
put('Oo','419 480 487 488 489 490 500 502 503 504');
put('Oi','424 430 431 432 433 435 439 440 458 461 469 470 481 482 483 501');
put('Om','425 428 441 445 454 457 493 496 505 509');
put('Op','444 507 508 514');
put('On','446 448 451 464 466 486 492 513');
put('Ol','453 475');
put('Ps','420 462 463'); put('Pi','442 450 452');
put('Pv','417 427 436 443 455 459 460 465 478 506 511 512'); put('Pu','477');
put('Tn','447'); put('Ta','429 456 479 491');
put('Aw','415 418 495 498'); put('Ac','422 510');
put('Op','515 548 556 566 576');
put('Oo','516 521 549 559 569 570');
put('Oh','518 519 532 533 536 546 547 560');
put('Oi','520 558 565 568');
put('Ot','527 540 575'); put('Ol','528 539 561 574');
put('Om','529 542 555 564 567');
put('On','525 534 535 550 551 552 557 572 573');
put('Pv','517 522 523 524 530 531 538 544 562 563'); put('Ps','543 545'); put('Pi','541');
put('Ak','526 553'); put('Aw','537'); put('Ar','554'); put('Ta','571 577');
put('Tr','578 581 582 609'); put('Td','579 588 612 615 618');
put('Tg','580 585 586 587 594 595 597 598 600 601 602 603 604 605 610 611 619');
put('Tn','584 589 590 596 607 616 617'); put('Tc','608 614'); put('Te','613');
put('Bd','591'); put('Aa','583 592'); put('Aj','593 599'); put('Cq','606');
put('Tn','620 621 622 625 626 628 632 633 637 648 649 653 655 657');
put('Td','623'); put('Tr','624 630 634 643 644 645 651 654');
put('Tg','627 635 639 642 646 647'); put('Ta','636'); put('Te','631 638 656');
put('Tc','640 658'); put('Om','629 652'); put('As','650'); put('Ak','641');
put('Ce','662 669 680 684 688 689 693 695 697 702 704 710 714 716 718');
put('Cw','660 666 667 668 676 686 687 690 694 698 700 701 711 719');
put('Cb','671 674 691 692 696 699 703 706 713 715 717');
put('Cp','659 661 663 665 670 672 677 678 679 681 682 683 685 705 707 709 712');
put('Cq','673 708'); put('Cf','664 675');
put('Aa','720 721 722 724 725 727 728 733 735 752 753');
put('Aj','723 726 729 738 742 743 748');
put('Ar','730 747 749 750 751 758');
put('As','731 732 734 736 737 739 741 744 746 754 755 756 757');
put('Ak','740 745');
put('Pt','233'); put('Bg','22'); put('Bd','395'); put('Pc','331');
const missing = source.map((_,i)=>i).filter(i=>!assignment.has(i));
if (missing.length) throw Error(`Unreviewed rows: ${missing}`);
const before = read('docs/content/theory-taxonomy-before.json');
const byId = new Map(before.map(t=>[t.id,t]));
const subcategories = Object.entries(definitions).flatMap(([major,[categoryId,,subs]])=>Object.entries(subs).map(([key,title],i)=>({id:`${categoryId}-${key}`,categoryId,title,displayOrder:i+1,code:major+key}))).filter(s=>[...assignment.values()].includes(s.code));
const subByCode = new Map(subcategories.map(s=>[s.code,s]));
// Representative foundations come first, followed by explicit thematic/editorial sequence.
const foundations = {
 Pc:[17,242,145,149,34,64,297,25,220,226], Pe:[54,35,56,18,30,270,262], Ps:[348,111,122,116,119,170,101,249,265],
 Pi:[0,130,110,128,95,180,205,300,194,298,91,267], Pa:[257,152,225,277,245,237,11,26], Pg:[299,5,89,181,151,134],
 Pm:[304,313,81,146,258,264,141,216,197], Pt:[303,9,71,10,202,250,272,239,160,302], Pv:[465,459,455,531,506,523,427,478,353,562], Pu:[247,78,73,103,271,279,252,167,20],
 Bd:[591,327,328,395,375,345,334,373,343,356], Bx:[308,393,314,380,337,403,316], Bh:[355,398,305,354,412], Bm:[115,326,329,346,407], Bg:[408,406,317,367,351,365,391,394,405], Be:[370,388,321,340,385,409,108], Bl:[315,70,140,49,232,50,320,335,389,312,349,386],
 Oi:[481,470,568,482,29,458,483,430,432,431,469], Ot:[488,437,527,468,575,474,416,473], Ol:[561,528,453,475,539,574], Oo:[489,501,502,503,504,500,549,521], Oh:[519,560,499,547,449,546,532,533,484,485], On:[464,573,535,448,557,446,534,451,551,552], Op:[444,556,515,514,88,507,508,566,576], Om:[505,445,457,509,496,564,529,428,542,629,567],
 Ta:[479,456,491,429,571,577,399,636], Tj:[401,400,357], Tn:[633,616,655,590,617,584,625,657,632,648,607,620,626,628], Tc:[640,658,614,608], Tg:[603,627,600,595,605,585,610,619,639,602,598,594,586,611,635,647,646,580], Tr:[654,634,624,609,644,645,581,651,582,643,578,630,410], Td:[579,623,615,618,588,612], Te:[613,631,638,656],
 Ac:[198,204,168,291,39,40,309,392,387,413], Ar:[69,68,172,554,750,751,758], At:[178], Aj:[136,599,593,251,726,743,723,742,738,729,748], Aa:[364,319,344,727,720,721,722,724,725,728,733,735,752,753,583,592], Aw:[379,537,415,418,61,498,77,495], As:[350,93,285,650,114,208], Ak:[520,740,745,641,526,553,376],
 Ce:[693,662,680,669,684,714,718,695,688,702,710,697,689,716,704], Cw:[687,207,711,660,686,668,667,690,698,701,666,694,700,676,719,280], Cb:[703,692,671,717,696,699,674,706,691,713,715], Cp:[709,672,659,663,661,685,707,665,682,670,679,678,681,677,683,705,712], Cq:[673,708,606], Cf:[664,675],
};
const orderedIndices = subcategories.flatMap(s=>{
 const members = [...assignment].filter(([,code])=>code===s.code).map(([i])=>i);
 const priority = (foundations[s.code] ?? []).filter(i=>members.includes(i));
 return [...new Set([...priority,...members])];
});
const memberOrder = new Map();
const positions = new Map();
orderedIndices.forEach(i=>{const code=assignment.get(i); const p=(positions.get(code)??0)+1;positions.set(code,p);memberOrder.set(i,p);});
const reviewed = source.map((t,i)=>{
 const s=subByCode.get(assignment.get(i)); const row=byId.get(t.tagId);
 if (!row || row.title!==t.title || row.summary!==t.summary) throw Error(`DB mismatch ${t.tagId}`);
 return {tagId:t.tagId,categoryId:s.categoryId,categoryTitle:definitions[assignment.get(i)[0]][1],subcategoryId:s.id,subcategoryTitle:s.title,sortOrder:memberOrder.get(i),previousCategoryId:t.categoryId,previousDisplayId:t.displayId};
});
// Strict A/C duplicates. Uncertain scholarly overlaps are retained for human review.
const merges = [
 {canonicalId:'kb_024',legacyId:'kb_418',reason:'英語表記のカタカナ名と日本語訳。同じ良い知らせへの能動的・建設的反応。',source:'https://doi.org/10.1037/0022-3514.87.2.228'},
 {canonicalId:'kb_566',legacyId:'kb_267',reason:'剥／剝の表記差。同じ比較基準に対する主観的不利益。',source:'https://dictionary.apa.org/relative-deprivation'},
 {canonicalId:'kb_588',legacyId:'kb_253',reason:'両概要とも喪失志向と回復志向の間の往復を定義。汎用的な二重過程理論とは区別。',source:'https://doi.org/10.1080/074811899201046'},
 {canonicalId:'kb_452',legacyId:'kb_103',reason:'肩書・専門性の手がかりを根拠以上に重みづける同一の判断傾向。服従研究とは別。',source:'https://dictionary.apa.org/authority'},
 {canonicalId:'kb_016',legacyId:'kb_392',reason:'両概要が適切に名前を呼ぶ同じ実用的工夫を定義。独立した学術効果ではない。',source:null},
];
const rename = {
 kb_785:['ヒューリスティック・システマティック・モデル',['HSM','ヒューリスティック系統的モデル']],
 kb_818:['心の理論',['Theory of Mind','ToM']], kb_724:['ビッグ・ファイブ',['Big Five','五因子モデル']],
 kb_725:['統制の所在',['ローカス・オブ・コントロール','Locus of Control']],
 kb_784:['精緻化可能性モデル',['ELM']], kb_772:['資源保存理論',['COR']],
 kb_848:['資源ベース理論',['RBV']], kb_764:['職務特性モデル',[]],
 kb_763:['職務要求資源モデル',['JD-R','職務要求‐資源モデル']],
 kb_804:['社会的認知キャリア理論',['SCCT']], kb_771:['従業員の発言行動',['Employee Voice','発言行動']],
 kb_406:['暫定的な理解の提示',['仮説提示効果']], kb_392:['呼び名の活用',['ネームコーリング効果','ネームコーリング']],
 kb_016:['呼び名の活用',['呼び名効果']],
 kb_825:['再認主導意思決定モデル',['RPD','熟達者の直観']],
};
write('docs/content/theory-taxonomy-plan.json',{sourceHash:hash,sourceCount:source.length,subcategories:subcategories.map(({code,...s})=>s),assignments:reviewed,merges,rename});
console.log({reviewed:reviewed.length,subcategories:subcategories.length,merges:merges.length});
