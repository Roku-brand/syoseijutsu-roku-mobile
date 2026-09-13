import { supabase } from '@/lib/supabase';
import type { CategoryKey } from './types';
export type OwnerPersona = { name: string; category: CategoryKey; status: 'published' | 'archived'; display_order: number };
export async function fetchOwnerPersonas(): Promise<OwnerPersona[]> {
 if (!supabase) throw new Error('Supabaseが未設定です。');
 const { data, error } = await supabase.from('personas').select('*').order('display_order').order('name');
 if (error) throw error;
 return data as OwnerPersona[];
}
export async function createPersona(name: string, category: CategoryKey) {
 if (!supabase) throw new Error('Supabaseが未設定です。');
 const { error } = await supabase.rpc('create_persona', { persona_name: name.trim(), persona_category: category });
 if (error) throw new Error(error.code === '23505' ? '同じ名前の人物像が存在します（削除済みを含みます）。別の名前を入力してください。' : error.message);
}
export async function archivePersona(name: string) {
 if (!supabase) throw new Error('Supabaseが未設定です。');
 const { error } = await supabase.rpc('archive_persona', { persona_name: name });
 if (error) throw error;
}
