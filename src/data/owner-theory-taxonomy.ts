import { supabase } from '@/lib/supabase';
import { applyTheorySubcategories, theorySubcategories, type TheorySubcategory } from './theory-taxonomy';
export async function fetchTheorySubcategories() {
 if(!supabase) throw Error('Supabaseが未設定です。');
 const {data,error}=await supabase.from('theory_subcategories').select('*').order('display_order');
 if(error) throw error;
 const rows=(data??[]).map(row=>({id:row.id,categoryId:row.category_id,title:row.title,displayOrder:row.display_order}));
 applyTheorySubcategories(rows);return rows;
}
export async function saveTheorySubcategory(row:TheorySubcategory) {
 if(!supabase) throw Error('Supabaseが未設定です。');
 const {error}=await supabase.rpc('save_theory_subcategory',{target_id:row.id,target_category:row.categoryId,target_title:row.title,target_order:row.displayOrder});
 if(error) throw error;
}
export async function deleteTheorySubcategory(id:string) {
 if(!supabase) throw Error('Supabaseが未設定です。');
 const {error}=await supabase.rpc('delete_theory_subcategory',{target_id:id});if(error)throw error;
}
export async function reorderSubcategoryTheories(subcategoryId:string,ids:string[]) {
 if(!supabase) throw Error('Supabaseが未設定です。');
 const {error}=await supabase.rpc('reorder_subcategory_theories',{target_id:subcategoryId,target_ids:ids});if(error)throw error;
}
export function subcategoryChoices(categoryId:string) {return theorySubcategories.filter(s=>s.categoryId===categoryId).sort((a,b)=>a.displayOrder-b.displayOrder);}
