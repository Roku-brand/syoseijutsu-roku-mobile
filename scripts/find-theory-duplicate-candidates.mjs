import fs from 'node:fs';
const rows=JSON.parse(fs.readFileSync('docs/content/theory-taxonomy-before.json','utf8'));
const norm=s=>s.normalize('NFKC').replaceAll('剝','剥').toLowerCase().replace(/[\s・／/（）()「」\-‐]/g,'');
const grams=s=>new Set([...norm(s)].slice(1).map((c,i)=>[...norm(s)][i]+c));
const dice=(a,b)=>2*[...a].filter(x=>b.has(x)).length/(a.size+b.size||1);
const features=rows.map(t=>({names:[t.title,...t.aliases].map(norm),title:grams(t.title),body:grams(t.summary)}));
const pairs=[];
for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
 const a=features[i],b=features[j];const exact=a.names.some(n=>b.names.includes(n));
 const title=dice(a.title,b.title),body=dice(a.body,b.body);
 if(exact||body>=0.62||title>=0.64) pairs.push({a:rows[i].id,b:rows[j].id,titleA:rows[i].title,titleB:rows[j].title,exact,titleSimilarity:+title.toFixed(3),definitionSimilarity:+body.toFixed(3)});
}
pairs.sort((a,b)=>Number(b.exact)-Number(a.exact)||b.definitionSimilarity-a.definitionSimilarity||b.titleSimilarity-a.titleSimilarity);
fs.writeFileSync('docs/content/theory-duplicate-candidates.json',JSON.stringify({comparedPairs:rows.length*(rows.length-1)/2,method:'NFKC title/alias match; character bigram Dice title >= .64 or definition >= .62. Candidate generation only, never merge decisions.',pairs},null,2)+'\n');
console.log(JSON.stringify(pairs));
