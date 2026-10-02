import { supabase } from './supabase';

export function profileAvatarPath(value: string | null | undefined, userId: string): string | null {
  if (!value) return null;
  const candidate = value.includes('://')
    ? value.split(/\/storage\/v1\/object\/(?:public|sign)\/profile-avatars\//)[1]?.split('?')[0]
    : value;
  if (!candidate || !candidate.startsWith(`${userId}/`) || candidate.includes('..') || candidate.includes('%') || candidate.split('/').length !== 2) return null;
  return candidate;
}

export async function signedProfileAvatar(path: string | null): Promise<string | null> {
  if (!path || !supabase) return null;
  const { data, error } = await supabase.storage.from('profile-avatars').createSignedUrl(path, 3600);
  return error ? null : data?.signedUrl ?? null;
}
