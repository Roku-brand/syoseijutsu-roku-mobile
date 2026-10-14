import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/lib/supabase';

export type EditorialCharacter = {
  id: string; name: string; role: string; bio: string; interests: string[];
  image_path: string | null; image_alt: string;
  status: 'draft' | 'published' | 'archived'; display_order: number; updated_at: string;
};
export type EditorialCharacterPayload = Omit<EditorialCharacter, 'id' | 'updated_at'>;
export const INITIAL_EDITORIAL_CHARACTER_IDS = ['sumino-haruka', 'sakaki-naoto', 'onose-tsumugi'];
type Snapshot = { characters: EditorialCharacter[]; loading: boolean; error: string };
const serverSnapshot: Snapshot = { characters: [], loading: true, error: '' };
let snapshot = serverSnapshot;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();
export async function refreshEditorialCharacters() {
  if (inflight) return inflight;
  inflight = Promise.resolve().then(async () => {
    try {
      if (!supabase) throw new Error('通信環境をご確認ください。');
      const { data, error } = await supabase.from('editorial_characters').select('*').eq('status', 'published').order('display_order').order('id');
      if (error) throw error;
      snapshot = { characters: (data ?? []) as EditorialCharacter[], loading: false, error: '' };
    } catch { snapshot = { ...snapshot, loading: false, error: '案内人を読み込めませんでした。もう一度お試しください。' }; }
    finally { inflight = null; listeners.forEach(listener => listener()); }
  });
  return inflight;
}
export function useEditorialCharacters(enabled = true) {
  const result = useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => snapshot, () => serverSnapshot);
  useEffect(() => { if (enabled) void refreshEditorialCharacters(); }, [enabled]);
  return result;
}
export async function fetchEditorialCharacterEditor() {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { data, error } = await supabase.from('editorial_characters').select('*').order('display_order').order('id');
  if (error) throw error;
  return (data ?? []) as EditorialCharacter[];
}
export function editorialCharacterPayload(character: EditorialCharacter): EditorialCharacterPayload {
  const { name, role, bio, interests, image_path, image_alt, status, display_order } = character;
  return { name, role, bio, interests, image_path, image_alt, status, display_order };
}
export function blankEditorialCharacter(): EditorialCharacterPayload {
  return { name: '', role: '処世術禄 編集案内人', bio: '', interests: [], image_path: null, image_alt: '', status: 'draft', display_order: 100 };
}
export async function saveEditorialCharacter(id: string | null, payload: EditorialCharacterPayload, updatedAt: string | null) {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { data, error } = await supabase.rpc('save_editorial_character', { target_id: id, content: payload, expected_updated_at: updatedAt });
  if (error) throw error;
  await refreshEditorialCharacters();
  return data as EditorialCharacter;
}
