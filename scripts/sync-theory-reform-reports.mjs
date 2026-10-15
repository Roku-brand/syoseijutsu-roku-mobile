import fs from 'node:fs';
import { wisdomSupportTechniqueIdsByTheoryId } from './master336-wisdom-support-links.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const theories=read('src/data/generated/theories.json');
const cards=read('src/data/generated/techniques.json').categories.flatMap(c=>c.subcategories.flatMap(p=>p.items));
const byId=new Map(theories.map(t=>[t.tagId,t]));
const prefix={psychology:'P','behavioral-science':'B','organization-management':'O',strategy:'T','practical-wisdom':'A','classics-thought':'C'};
let md='# master336 処世術→理論 紐づけ（網羅版・二段構成）\n\n> 2026年10月のSupabase正本と同期。主要理論は理解の入口、あわせて読む理論は補完・別視点。格言は実証的証拠を意味しない。\n';
const line=id=>{const t=byId.get(id);if(!t)throw Error('Missing '+id);return `- ${prefix[t.categoryId]}－${String(t.displayId).padStart(3,'0')}｜${t.title}`;};
for(const t of cards.filter(c=>Number(c.id.split('-')[1])<=336)){
 const p=t.primaryTheoryIds;const s=t.relatedTheoryIds.filter(id=>!p.includes(id));
 md+=`\n## ${t.id}｜${t.title}\n\n### 主要理論\n\n${p.length?p.map(line).join('\n'):'- なし'}\n\n### あわせて読む理論\n\n${s.length?s.map(line).join('\n'):'- なし'}\n\n合計：${p.length+s.length}件（主要${p.length}件・あわせて読む${s.length}件）。\n`;
}
fs.writeFileSync('master336_theory_links_final.md',md);
const a=read('docs/theory-link-audit/content-review-summary.json');
const linked=new Set(cards.flatMap(c=>c.relatedTheoryIds));
const dist=fn=>Object.fromEntries([...new Set(cards.map(fn))].sort((a,b)=>a-b).map(n=>[n,cards.filter(c=>fn(c)===n).length]));
Object.assign(a,{theories:theories.length,links:cards.reduce((n,c)=>n+c.relatedTheoryIds.length,0),primaryLinks:cards.reduce((n,c)=>n+c.primaryTheoryIds.length,0),linkedTheories:linked.size,unlinkedTheories:theories.length-linked.size,minimumLinksPerTechnique:Math.min(...cards.map(c=>c.relatedTheoryIds.length)),maximumLinksPerTechnique:Math.max(...cards.map(c=>c.relatedTheoryIds.length)),distribution:dist(c=>c.relatedTheoryIds.length),primaryDistribution:dist(c=>c.primaryTheoryIds.length),supplementaryDistribution:dist(c=>c.relatedTheoryIds.length-c.primaryTheoryIds.length),wisdomSupportLinks:Object.values(wisdomSupportTechniqueIdsByTheoryId).reduce((n,v)=>n+v.length,0),generatedAt:'2026-10-15'});
a.supplementaryLinks=a.links-a.primaryLinks;
a.categoryCoverage=Object.fromEntries(Object.keys(prefix).map(category=>{const rows=theories.filter(t=>t.categoryId===category);const ids=new Set(rows.map(t=>t.tagId));return [category,{theories:rows.length,linkedTheories:rows.filter(t=>linked.has(t.tagId)).length,links:cards.flatMap(c=>c.relatedTheoryIds).filter(id=>ids.has(id)).length}];}));
fs.writeFileSync('docs/theory-link-audit/content-review-summary.json',JSON.stringify(a,null,2)+'\n');
console.log({links:a.links,primary:a.primaryLinks,linked:a.linkedTheories});
