import fs from 'node:fs';

const read = path => JSON.parse(fs.readFileSync(path,'utf8'));
const theories = new Map(read('src/data/generated/theories.json').map(t=>[t.tagId,t]));
const cards = new Map(read('src/data/generated/techniques.json').categories.flatMap(c=>c.subcategories.flatMap(s=>s.items)).map(t=>[t.id,t]));
const prefixes = {psychology:'P','behavioral-science':'B','organization-management':'O',strategy:'T','practical-wisdom':'A','classics-thought':'C'};
const path = 'master336_theory_links_final.md';
const source = fs.readFileSync(path,'utf8').replaceAll('\r','');
const blocks = source.split(/^## /m);
const result = [blocks[0],...blocks.slice(1).map(block=>{
  const card = cards.get(block.split('｜')[0]);
  if(!card)throw Error('Unknown technique in mapping headings');
  const ids = [...card.primaryTheoryIds,...card.relatedTheoryIds.filter(id=>!card.primaryTheoryIds.includes(id))];
  let index=0;
  const updated=block.replace(/^- [PBOTAC]－\d{3}｜.+$/gm,()=>{
    const theory=theories.get(ids[index++]);
    if(!theory)throw Error('Missing theory in mapping headings');
    return `- ${prefixes[theory.categoryId]}－${String(theory.displayId).padStart(3,'0')}｜${theory.title}`;
  });
  if(index!==ids.length)throw Error('Mapping document and reviewed links differ: '+card.id);
  return updated;
})].join('## ');
fs.writeFileSync(path,result);
console.log('Synced mapping headings with the canonical theory titles and display IDs.');
