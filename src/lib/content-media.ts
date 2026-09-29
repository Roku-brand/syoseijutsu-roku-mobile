import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export const CONTENT_IMAGE_BUCKET = 'content-images';
export type ContentImageAsset = ImagePicker.ImagePickerAsset;

export function contentImageUrl(path: string | null | undefined): string | null {
  if (!path || path.startsWith('bundled:') || !supabase) return null;
  return supabase.storage.from(CONTENT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function pickContentImage(): Promise<ContentImageAsset | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9, base64: true });
  return result.canceled ? null : result.assets[0] ?? null;
}

function decodeBase64(source: string): Uint8Array<ArrayBuffer> {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = source.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor(clean.length * 3 / 4));
  let bits = 0; let count = 0; let index = 0;
  for (const char of clean) {
    bits = (bits << 6) | alphabet.indexOf(char);
    count += 6;
    if (count >= 8) { count -= 8; if (index < bytes.length) bytes[index++] = (bits >>> count) & 255; }
  }
  return bytes;
}

export async function uploadContentImage(asset: ContentImageAsset, kind: 'persona' | 'technique' | 'theory', id: string): Promise<string> {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const mime = asset.mimeType ?? 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new Error('JPEG・PNG・WebP画像を選択してください。');
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error('画像は5MB以下にしてください。');
  const extension = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const path = `${kind}/${encodeURIComponent(id)}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const body = asset.base64 ? decodeBase64(asset.base64) : new Uint8Array(await (await fetch(asset.uri)).arrayBuffer());
  const { error } = await supabase.storage.from(CONTENT_IMAGE_BUCKET).upload(path, body, { contentType: mime, upsert: false });
  if (error) throw error;
  return path;
}

export async function countImageReferences(path: string): Promise<number> {
  if (!supabase || !path || path.startsWith('bundled:')) return 0;
  const rows = await Promise.all(['personas', 'techniques', 'theories'].map((table) =>
    supabase!.from(table).select('*', { count: 'exact', head: true }).eq('image_path', path)));
  for (const row of rows) if (row.error) throw row.error;
  return rows.reduce((count, row) => count + (row.count ?? 0), 0);
}

export async function removeContentImageIfUnused(path: string | null | undefined): Promise<boolean> {
  if (!supabase || !path || path.startsWith('bundled:')) return false;
  if (await countImageReferences(path)) return false;
  const { error } = await supabase.storage.from(CONTENT_IMAGE_BUCKET).remove([path]);
  if (error) throw error;
  return true;
}

