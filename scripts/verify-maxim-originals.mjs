// Read only the selected originals, not bulk quote-site translations.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const audit = JSON.parse(await fs.readFile('docs/content/historical-maxims-audit-20261015.json','utf8'));
const normalize = value => value.normalize('NFC').replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/\s+/g,'').trim();
const decodeEntities = html => html.replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n))).replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
const receipts=[];const cache=new Map();
for(const row of audit.filter(r=>r.decision!=='hold')){
 try{
  let text=cache.get(row.primaryUrl);
  if(!text){
   const response=await fetch(row.primaryUrl);if(!response.ok)throw Error('HTTP '+response.status);
   const bytes=new Uint8Array(await response.arrayBuffer());
   const html=new TextDecoder(row.primaryUrl.includes('aozora.gr.jp')?'shift_jis':'utf-8').decode(bytes);
   text=decodeEntities(html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<rt[^>]*>[\s\S]*?<\/rt>/gi,'').replace(/<rp[^>]*>[\s\S]*?<\/rp>/gi,'').replace(/<[^>]+>/g,' '));cache.set(row.primaryUrl,text);
  }
  if(!normalize(text).includes(normalize(row.originalText)))throw Error('Selected original does not occur in the source');
  receipts.push({candidateId:row.candidateId,url:row.primaryUrl,originalSha256:createHash('sha256').update(row.originalText).digest('hex'),sourceTextSha256:createHash('sha256').update(text).digest('hex'),verified:true,checkedOn:row.checkedOn});
  console.log(row.candidateId,'matched');
 }catch(error){receipts.push({candidateId:row.candidateId,url:row.primaryUrl,verified:false,error:error.message});console.error(row.candidateId,error.message);process.exitCode=1;}
}
await fs.writeFile('docs/content/historical-maxims-source-receipts-20261015.json',JSON.stringify(receipts,null,2)+'\n');
