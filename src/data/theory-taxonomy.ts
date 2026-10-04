import bundledSubcategories from './generated/theory-subcategories.json';
import bundledRedirects from './generated/theory-id-redirects.json';
import type { TheoryCard } from './types';

export type TheorySubcategory = { id: string; categoryId: string; title: string; displayOrder: number };
export const theorySubcategories: TheorySubcategory[] = [...bundledSubcategories];
const redirects = new Map<string,string>(Object.entries(bundledRedirects));
export function resolveTheoryId(id: string): string { return redirects.get(id) ?? id; }
export function resolveTheoryIds(ids: unknown): string[] {
 return Array.isArray(ids) ? [...new Set(ids.filter((id): id is string=>typeof id==='string').map(resolveTheoryId))] : [];
}
export function applyTheoryRedirects(rows: TheoryCard[]) {
 for (const row of rows) for (const id of row.legacyIds ?? []) redirects.set(id,row.tagId);
}
export function applyTheorySubcategories(rows: TheorySubcategory[]) {
 theorySubcategories.splice(0,theorySubcategories.length,...rows.sort((a,b)=>a.displayOrder-b.displayOrder));
}
export function getTheoryPath(theory: TheoryCard) {
 const sub = theorySubcategories.find(s=>s.id===theory.subcategoryId && s.categoryId===theory.categoryId);
 return [theory.categoryTitle,sub?.title ?? theory.subcategoryTitle].filter(Boolean).join(' > ');
}
export function compareTheoryTaxonomy(a: TheoryCard,b: TheoryCard) {
 const order=(t:TheoryCard)=>theorySubcategories.find(s=>s.id===t.subcategoryId)?.displayOrder??Number.MAX_SAFE_INTEGER;
 return order(a)-order(b)||(a.sortOrder??a.displayId??Number.MAX_SAFE_INTEGER)-(b.sortOrder??b.displayId??Number.MAX_SAFE_INTEGER)||a.tagId.localeCompare(b.tagId);
}
export function groupTheorySections(rows: TheoryCard[]) {
 const sections: {categoryId:string;categoryTitle:string;subcategoryId:string;title:string;items:TheoryCard[]}[]=[];
 for (const row of rows) {
  const key=row.subcategoryId??'unassigned';
  let section=sections.find(s=>s.categoryId===row.categoryId && s.subcategoryId===key);
  if(!section){section={categoryId:row.categoryId,categoryTitle:row.categoryTitle,subcategoryId:key,title:theorySubcategories.find(s=>s.id===key)?.title??row.subcategoryTitle??'分類確認中',items:[]};sections.push(section);}
  section.items.push(row);
 }
 return sections;
}
