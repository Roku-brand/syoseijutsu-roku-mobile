import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
registerHooks({resolve(specifier,context,next){
 if(specifier==='@/data/persona-presentation') return {url:'data:text/javascript,export const getPersonaPresentation=()=>undefined;',shortCircuit:true};
 let url;
 if(specifier.startsWith('@/')) url=pathToFileURL(path.join(root,'src',specifier.slice(2)));
 else if(specifier.startsWith('./')||specifier.startsWith('../')) url=new URL(specifier,context.parentURL);
 if(url?.protocol==='file:'){
  let p=fileURLToPath(url);
  if(!path.extname(p)&&fs.existsSync(p+'.ts')){p+='.ts';url=pathToFileURL(p);}
  if(p.endsWith('.json'))return {url:'data:text/javascript,'+encodeURIComponent('export default '+fs.readFileSync(p,'utf8')),shortCircuit:true};
  if(fs.existsSync(p))return {url:url.href,shortCircuit:true};
 }
 return next(specifier,context);
}});
