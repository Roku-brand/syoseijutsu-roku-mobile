import { supabase } from '@/lib/supabase';
import type { CategoryKey } from './types';
export type OwnerPersona = { id: string; name: string; subtitle: string; image_path: string | null; access_tier: 'free' | 'complete'; category: CategoryKey; status: 'published' | 'draft' | 'archived'; draft_technique_ids: string[]; display_order: number; updated_at: string };
export async function fetchOwnerPersonas(): Promise<OwnerPersona[]> {
 if (!supabase) throw new Error('Supabaseが未設定です。');
 const { data, error } = await supabase.from('personas').select('*').order('display_order').order('name');
 if (error) throw error;
 return data as OwnerPersona[];
}
export async function archivePersona(name: string) {
 if (!supabase) throw new Error('Supabaseが未設定です。');
 const { error } = await supabase.rpc('archive_persona', { persona_name: name });
 if (error) throw error;
}
export async function savePersona(persona: Pick<OwnerPersona, 'id' | 'name' | 'subtitle' | 'image_path' | 'access_tier' | 'category' | 'status'>, relatedTechniqueIds?: string[]): Promise<OwnerPersona> {
 if (!supabase) throw new Error('Supabaseが未設定です。');
 const { data, error } = await supabase.rpc('save_persona', { target_id: persona.id, payload: { ...persona, related_technique_ids: relatedTechniqueIds } });
 if (error) throw error;
 return (Array.isArray(data) ? data[0] : data) as OwnerPersona;
}

